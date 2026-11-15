import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { authMiddleware, signToken } from "../middleware/auth.js";

const router = Router();

// Регистрация
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email и пароль обязательны" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Пароль должен быть не менее 6 символов" });
  try {
    const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (existing.rows.length)
      return res
        .status(409)
        .json({ error: "Пользователь с таким email уже существует" });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email.toLowerCase(), hash, name || ""]
    );
    const user = result.rows[0];
    await pool.query(
      "INSERT INTO user_state (user_id, data) VALUES ($1, $2)",
      [user.id, "{}"]
    );
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Вход
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email и пароль обязательны" });
  try {
    const result = await pool.query(
      "SELECT id, email, name, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: "Неверный email или пароль" });
    const user = result.rows[0];
    if (!(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: "Неверный email или пароль" });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Текущий пользователь
router.get("/me", authMiddleware, (req, res) => {
  res.json({ id: req.userId, email: req.userEmail });
});

export default router;
