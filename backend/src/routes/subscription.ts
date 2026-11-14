import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/subscription/plans — тарифные планы (публичный)
router.get("/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { durationDays: "asc" },
  });
  res.json(plans);
});

// Все остальные маршруты — требуют авторизации
router.use(authMiddleware);

// GET /api/subscription/status — статус подписки пользователя
router.get("/status", async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } });
  if (!sub) {
    return res.json({
      status: "none",
      planCode: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
    });
  }
  const isActive = sub.status === "active" && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
  res.json({
    status: sub.status,
    planCode: sub.planCode,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    isActive,
  });
});

// POST /api/subscription/checkout — создать Stripe Checkout session
router.post("/checkout", async (req: AuthedRequest, res) => {
  try {
    const { planCode } = req.body;
    if (!planCode) return res.status(400).json({ error: "Укажите тариф" });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan || !plan.active) return res.status(400).json({ error: "Тариф не найден" });

    // Проверяем, нет ли уже активной подписки
    const existing = await prisma.subscription.findUnique({ where: { userId: req.userId! } });
    if (existing && existing.status === "active" && !existing.cancelAtPeriodEnd) {
      return res.status(409).json({ error: "У вас уже есть активная подписка" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: "Stripe не настроен. Обратитесь к администратору." });
    }

    // Создаём или получаем Stripe customer
    let stripeCustomerId = existing?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user!.email,
        name: user!.name || undefined,
      });
      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: plan.stripePriceId
        ? [{ price: plan.stripePriceId, quantity: 1 }]
        : [{
            price_data: {
              currency: plan.currency,
              product_data: { name: `AINA Evidence — ${plan.name}` },
              unit_amount: plan.priceCents,
              recurring: plan.interval === "month"
                ? { interval: "month" }
                : plan.interval === "quarter"
                ? { interval: "month", interval_count: 3 }
                : { interval: "year" },
            },
            quantity: 1,
          }],
      mode: "subscription",
      success_url: `${req.headers.origin || ""}/subscription?success=1`,
      cancel_url: `${req.headers.origin || ""}/subscription?canceled=1`,
      client_reference_id: req.userId,
      metadata: { userId: req.userId!, planCode: plan.code },
    });

    // Сохраняем stripeCustomerId
    await prisma.subscription.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        planCode: plan.code,
        status: "incomplete",
        stripeCustomerId,
      },
      update: {
        planCode: plan.code,
        stripeCustomerId,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Ошибка создания платежа" });
  }
});

// POST /api/subscription/cancel — отменить автопродление
router.post("/cancel", async (req: AuthedRequest, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } });
    if (!sub || sub.status !== "active") {
      return res.status(400).json({ error: "Нет активной подписки" });
    }

    if (sub.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await prisma.subscription.update({
      where: { userId: req.userId! },
      data: { cancelAtPeriodEnd: true },
    });

    res.json({ ok: true, message: "Автопродление отменено. Доступ сохранён до конца оплаченного периода." });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: "Ошибка отмены" });
  }
});

// POST /api/subscription/portal — Stripe billing portal
router.post("/portal", async (req: AuthedRequest, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId! } });
    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ error: "Нет привязанной карты" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: "Stripe не настроен" });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${req.headers.origin || ""}/subscription`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Ошибка портала" });
  }
});

// GET /api/subscription/payments — история платежей
router.get("/payments", async (req: AuthedRequest, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(payments);
});

export default router;
