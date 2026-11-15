import { Router } from "express";
import { pool } from "../db.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const router = Router();

// Получить все настройки (для админ-панели)
router.get("/settings", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const result = await pool.query("SELECT key, value FROM app_settings");
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновить тарифы
router.put("/plans", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { plans } = req.body;
    if (!Array.isArray(plans)) return res.status(400).json({ error: "Неверный формат" });
    await pool.query(
      "INSERT INTO app_settings (key, value) VALUES ('plans', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify(plans)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Update plans error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновить вступительный платёж
router.put("/init-fee", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { initFee } = req.body;
    await pool.query(
      "INSERT INTO app_settings (key, value) VALUES ('init_fee', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify(initFee)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Update init fee error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновить бесплатные функции
router.put("/free-features", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { freeFeatures } = req.body;
    await pool.query(
      "INSERT INTO app_settings (key, value) VALUES ('free_features', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify(freeFeatures)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Update free features error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Статистика для админ-панели
router.get("/stats", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    // Всего пользователей
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users WHERE is_admin = FALSE");
    // Активные подписчики
    const activeSubs = await pool.query(
      "SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND (current_period_end IS NULL OR current_period_end > NOW())"
    );
    // Отменённые подписки
    const canceledSubs = await pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'canceled'");
    // Выручка за день
    const revenueDay = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded' AND created_at >= NOW() - INTERVAL '1 day'"
    );
    // Выручка за месяц
    const revenueMonth = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded' AND created_at >= NOW() - INTERVAL '30 days'"
    );
    // Выручка за год
    const revenueYear = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded' AND created_at >= NOW() - INTERVAL '365 days'"
    );
    // Выручка по тарифам
    const revenueByPlan = await pool.query(
      `SELECT plan_id, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded' GROUP BY plan_id`
    );
    // Неудачные платежи
    const failedPayments = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'failed'"
    );
    // Список пользователей
    const users = await pool.query(
      `SELECT u.id, u.email, u.name, u.created_at,
        (SELECT plan_id FROM subscriptions WHERE user_id = u.id AND status = 'active' ORDER BY created_at DESC LIMIT 1) as active_plan,
        (SELECT status FROM subscriptions WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sub_status
       FROM users WHERE u.is_admin = FALSE ORDER BY u.created_at DESC LIMIT 100`
    );

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      activeSubscribers: parseInt(activeSubs.rows[0].count),
      canceledSubscriptions: parseInt(canceledSubs.rows[0].count),
      revenueDay: parseInt(revenueDay.rows[0].total),
      revenueMonth: parseInt(revenueMonth.rows[0].total),
      revenueYear: parseInt(revenueYear.rows[0].total),
      revenueByPlan: revenueByPlan.rows.map((r) => ({
        planId: r.plan_id,
        count: parseInt(r.count),
        total: parseInt(r.total),
      })),
      failedPayments: {
        count: parseInt(failedPayments.rows[0].count),
        total: parseInt(failedPayments.rows[0].total),
      },
      users: users.rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.created_at,
        activePlan: u.active_plan,
        subStatus: u.sub_status,
      })),
    });
  } catch (err) {
    console.error("Get admin stats error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Публичные тарифы (без авторизации)
router.get("/plans", async (_req, res) => {
  try {
    const result = await pool.query("SELECT value FROM app_settings WHERE key = 'plans'");
    const initFeeResult = await pool.query("SELECT value FROM app_settings WHERE key = 'init_fee'");
    const freeResult = await pool.query("SELECT value FROM app_settings WHERE key = 'free_features'");
    res.json({
      plans: result.rows[0]?.value || [],
      initFee: initFeeResult.rows[0]?.value || { enabled: false },
      freeFeatures: freeResult.rows[0]?.value || {},
    });
  } catch (err) {
    console.error("Get public plans error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
