import { Router } from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Получить состояние пользователя
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT data FROM user_state WHERE user_id = $1",
      [req.userId]
    );
    if (!result.rows.length) {
      await pool.query(
        "INSERT INTO user_state (user_id, data) VALUES ($1, $2)",
        [req.userId, "{}"]
      );
      return res.json({});
    }
    res.json(result.rows[0].data);
  } catch (err) {
    console.error("Get state error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Сохранить состояние пользователя
router.put("/", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO user_state (user_id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.userId, JSON.stringify(req.body)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Save state error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
