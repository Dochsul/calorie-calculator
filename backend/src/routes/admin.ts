import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, adminMiddleware, AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/stats — статистика для дашборда
router.get("/stats", async (_req, res) => {
  const [totalUsers, activeSubs, totalRevenue, monthRevenue, canceledSubs, failedPayments] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "active", cancelAtPeriodEnd: false } }),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "succeeded" } }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: "succeeded", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    }),
    prisma.subscription.count({ where: { status: "canceled" } }),
    prisma.payment.count({ where: { status: "failed" } }),
  ]);

  const subsByPlan = await prisma.subscription.groupBy({
    by: ["planCode"],
    where: { status: "active" },
    _count: true,
  });

  const totalMenus = await prisma.menu.count();

  res.json({
    totalUsers,
    activeSubs,
    totalRevenueEuros: (totalRevenue._sum.amountCents || 0) / 100,
    monthRevenueEuros: (monthRevenue._sum.amountCents || 0) / 100,
    canceledSubs,
    failedPayments,
    subsByPlan,
    totalMenus,
  });
});

// GET /api/admin/users — список пользователей
router.get("/users", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 50;
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, createdAt: true,
      subscription: { select: { status: true, planCode: true, currentPeriodEnd: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  const total = await prisma.user.count();
  res.json({ users, total, pages: Math.ceil(total / limit) });
});

// GET /api/admin/payments — все платежи
router.get("/payments", async (req, res) => {
  const payments = await prisma.payment.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(payments);
});

// GET /api/admin/plans — тарифы
router.get("/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { durationDays: "asc" } });
  res.json(plans);
});

// PUT /api/admin/plans/:code — обновить тариф
router.put("/plans/:code", async (req, res) => {
  try {
    const { priceCents, active, stripePriceId } = req.body;
    const plan = await prisma.subscriptionPlan.update({
      where: { code: req.params.code },
      data: {
        priceCents: priceCents !== undefined ? parseInt(priceCents) : undefined,
        active: active !== undefined ? active : undefined,
        stripePriceId: stripePriceId || undefined,
      },
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления тарифа" });
  }
});

export default router;
