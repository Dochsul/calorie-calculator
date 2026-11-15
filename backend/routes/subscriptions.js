import { Router } from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Проверка активной подписки
export async function hasActiveSubscription(userId) {
  const result = await pool.query(
    `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' AND (current_period_end IS NULL OR current_period_end > NOW())`,
    [userId]
  );
  return result.rows.length > 0;
}

// Middleware: проверка подписки для платных функций
export async function requireSubscription(req, res, next) {
  try {
    const active = await hasActiveSubscription(req.userId);
    if (!active) {
      return res.status(403).json({ error: "Требуется активная подписка", code: "NO_SUBSCRIPTION" });
    }
    next();
  } catch (err) {
    console.error("Subscription check error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

// Получить статус подписки пользователя
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );
    const sub = result.rows[0] || null;
    const payments = await pool.query(
      `SELECT id, amount, currency, status, plan_id, type, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.userId]
    );
    res.json({
      subscription: sub ? {
        planId: sub.plan_id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      } : null,
      payments: payments.rows.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        planId: p.plan_id,
        type: p.type,
        createdAt: p.created_at,
      })),
    });
  } catch (err) {
    console.error("Get subscription status error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Создать Stripe Checkout Session
router.post("/checkout", authMiddleware, async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body;
  if (!planId) return res.status(400).json({ error: "Не указан тариф" });

  try {
    // Получить тарифы из БД
    const settingsResult = await pool.query("SELECT value FROM app_settings WHERE key = 'plans'");
    const plans = settingsResult.rows[0]?.value || [];
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return res.status(400).json({ error: "Неизвестный тариф" });

    const initFeeResult = await pool.query("SELECT value FROM app_settings WHERE key = 'init_fee'");
    const initFee = initFeeResult.rows[0]?.value || { enabled: false };

    // Проверка Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({ error: "Stripe не настроен. Обратитесь к администратору.", code: "STRIPE_NOT_CONFIGURED" });
    }

    // Динамический импорт Stripe
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    // Найти или создать клиента Stripe
    let customerId;
    const existingSub = await pool.query(
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 AND stripe_customer_id IS NOT NULL LIMIT 1",
      [req.userId]
    );
    if (existingSub.rows.length) {
      customerId = existingSub.rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.userEmail,
        metadata: { userId: req.userId },
      });
      customerId = customer.id;
    }

    // Создать Price в Stripe (или использовать существующий)
    // Map plan interval to Stripe recurring interval
    const intervalMap = {
      "month": "month",
      "3-month": "month",
      "year": "year",
    };
    const intervalCountMap = {
      "month": 1,
      "3-month": 3,
      "year": 1,
    };

    const price = await stripe.prices.create({
      currency: plan.currency || "eur",
      unit_amount: plan.price,
      recurring: {
        interval: intervalMap[plan.interval] || "month",
        interval_count: intervalCountMap[plan.interval] || 1,
      },
      product_data: {
        name: `Aina Évidence — ${plan.label}`,
      },
    });

    const lineItems = [
      { price: price.id, quantity: 1 },
    ];

    // Разовый вступительный платёж
    if (initFee.enabled) {
      const feePrice = await stripe.prices.create({
        currency: initFee.currency || "eur",
        unit_amount: initFee.amount,
        product_data: {
          name: "Aina Évidence — вступительный взнос",
        },
      });
      lineItems.push({ price: feePrice.id, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "subscription",
      success_url: successUrl || `${req.headers.origin}/?payment=success`,
      cancel_url: cancelUrl || `${req.headers.origin}/?payment=cancel`,
      metadata: {
        userId: req.userId,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          userId: req.userId,
          planId: planId,
        },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    if (err.type === "StripeError") {
      return res.status(400).json({ error: err.message, code: "STRIPE_ERROR" });
    }
    res.status(500).json({ error: "Ошибка создания платежной сессии" });
  }
});

// Отменить подписку (в конце периода)
router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const subResult = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [req.userId]
    );
    if (!subResult.rows.length) {
      return res.status(400).json({ error: "Нет активной подписки" });
    }
    const sub = subResult.rows[0];
    if (!sub.stripe_subscription_id) {
      return res.status(400).json({ error: "Подписка не привязана к Stripe" });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(503).json({ error: "Stripe не настроен" });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await pool.query(
      "UPDATE subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE id = $1",
      [sub.id]
    );

    res.json({ ok: true, message: "Подписка будет отменена в конце оплаченного периода" });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({ error: "Ошибка отмены подписки" });
  }
});

// Stripe Webhook
router.post("/webhook", async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) return res.status(503).json({ error: "Stripe not configured" });

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    let event = req.body;
    if (webhookSecret) {
      const sig = req.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        if (userId && planId) {
          const subId = session.subscription;
          const customerId = session.customer;

          // Получить детали подписки из Stripe
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          await pool.query(
            `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan_id, status, current_period_start, current_period_end)
             VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
            [
              userId,
              subId,
              customerId,
              planId,
              new Date(stripeSub.current_period_start * 1000),
              new Date(stripeSub.current_period_end * 1000),
            ]
          );

          // Записать платёж
          await pool.query(
            `INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, status, plan_id, type)
             VALUES ($1, $2, $3, $4, 'succeeded', $5, 'subscription')`,
            [userId, session.payment_intent, session.amount_total, session.currency, planId]
          );
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          // Обновить период подписки
          const subResult = await pool.query(
            "SELECT * FROM subscriptions WHERE stripe_subscription_id = $1",
            [subId]
          );
          if (subResult.rows.length) {
            const sub = subResult.rows[0];
            await pool.query(
              `UPDATE subscriptions SET status = 'active', current_period_start = $1, current_period_end = $2, updated_at = NOW() WHERE id = $3`,
              [
                new Date(invoice.period_start * 1000),
                new Date(invoice.period_end * 1000),
                sub.id,
              ]
            );
            // Записать платёж (продление)
            const planId = sub.plan_id;
            await pool.query(
              `INSERT INTO payments (user_id, stripe_invoice_id, amount, currency, status, plan_id, type)
               VALUES ($1, $2, $3, $4, 'succeeded', $5, 'subscription')`,
              [sub.user_id, invoice.id, invoice.amount_paid, invoice.currency, planId]
            );
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const subResult = await pool.query(
            "SELECT * FROM subscriptions WHERE stripe_subscription_id = $1",
            [subId]
          );
          if (subResult.rows.length) {
            const sub = subResult.rows[0];
            await pool.query(
              "UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = $1",
              [sub.id]
            );
            await pool.query(
              `INSERT INTO payments (user_id, stripe_invoice_id, amount, currency, status, plan_id, type)
               VALUES ($1, $2, $3, $4, 'failed', $5, 'subscription')`,
              [sub.user_id, invoice.id, invoice.amount_due, invoice.currency, sub.plan_id]
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await pool.query(
          "UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE stripe_subscription_id = $1",
          [sub.id]
        );
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const status = sub.status === "active" ? "active" : sub.status;
        await pool.query(
          `UPDATE subscriptions SET status = $1, current_period_start = $2, current_period_end = $3, cancel_at_period_end = $4, updated_at = NOW()
           WHERE stripe_subscription_id = $5`,
          [
            status,
            new Date(sub.current_period_start * 1000),
            new Date(sub.current_period_end * 1000),
            sub.cancel_at_period_end,
            sub.id,
          ]
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
