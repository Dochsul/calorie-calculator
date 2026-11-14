import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { signToken } from "../lib/auth.js";
import { authMiddleware, AuthedRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req: AuthedRequest, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: "Пользователь с таким email уже существует" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || null,
      },
    });

    // Создаём пустые предпочтения
    await prisma.userPreference.create({
      data: { userId: user.id },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: AuthedRequest, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  res.json(user);
});

// PUT /api/auth/me — обновить профиль
router.put("/me", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { name: name ?? undefined },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления профиля" });
  }
});

// DELETE /api/auth/me — удалить аккаунт
router.delete("/me", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId! } });
    res.json({ ok: true, message: "Аккаунт удалён" });
  } catch (err) {
    res.status(500).json({ error: "Ошибка удаления аккаунта" });
  }
});

export default router;
