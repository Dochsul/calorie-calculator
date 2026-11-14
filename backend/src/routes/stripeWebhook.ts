import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// POST /api/stripe/webhook — обработка Stripe-событий
router.post("/", async (req, res) => {
  const stripeSignature = req.headers["stripe-signature"] as string;
  let event;

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    if (!process.env.STRIPE_WEBHOOK_SECRET || !stripeSignature) {
      // Без секрета — пропускаем (тестовый режим)
      return res.json({ received: false, error: "webhook secret not configured" });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      stripeSignature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Stripe webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id || "";
        const planCode = session.metadata?.planCode || "";

        if (userId && planCode) {
          const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              planCode,
              status: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              currentPeriodEnd: plan ? new Date(Date.now() + plan.durationDays * 86400000) : null,
            },
            update: {
              planCode,
              status: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              currentPeriodEnd: plan ? new Date(Date.now() + plan.durationDays * 86400000) : null,
              cancelAtPeriodEnd: false,
            },
          });

          if (plan) {
            await prisma.payment.create({
              data: {
                userId,
                amountCents: plan.priceCents,
                planCode: plan.code,
                status: "succeeded",
                stripePaymentIntentId: session.payment_intent as string,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (sub && invoice.amount_paid > 0) {
          const plan = await prisma.subscriptionPlan.findUnique({ where: { code: sub.planCode } });
          await prisma.payment.create({
            data: {
              userId: sub.userId,
              amountCents: invoice.amount_paid,
              planCode: sub.planCode,
              status: "succeeded",
              stripeInvoiceId: invoice.id,
            },
          }).catch(() => {});
          if (plan) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: "active",
                currentPeriodEnd: new Date(Date.now() + plan.durationDays * 86400000),
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (sub) {
          await prisma.payment.create({
            data: {
              userId: sub.userId,
              amountCents: invoice.amount_due,
              planCode: sub.planCode,
              status: "failed",
              stripeInvoiceId: invoice.id,
            },
          }).catch(() => {});
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "past_due" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "canceled", cancelAtPeriodEnd: false },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: subscription.status === "active" ? "active" : subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : undefined,
            },
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
