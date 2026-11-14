import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/fridge — список продуктов в холодильнике
router.get("/", async (req: AuthedRequest, res) => {
  const items = await prisma.fridgeItem.findMany({
    where: { userId: req.userId! },
    include: { food: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

// POST /api/fridge — добавить продукт
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const { foodId, amount, unit } = req.body;
    if (!foodId || !amount) {
      return res.status(400).json({ error: "Укажите продукт и количество" });
    }
    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) return res.status(400).json({ error: "Продукт не найден в базе" });

    const item = await prisma.fridgeItem.create({
      data: {
        userId: req.userId!,
        foodId,
        amount: parseFloat(amount),
        unit: unit || "г",
      },
      include: { food: true },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Ошибка добавления продукта" });
  }
});

// PUT /api/fridge/:id — обновить количество
router.put("/:id", async (req: AuthedRequest, res) => {
  try {
    const { amount, unit } = req.body;
    const item = await prisma.fridgeItem.update({
      where: { id: req.params.id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        unit: unit || undefined,
      },
      include: { food: true },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления" });
  }
});

// DELETE /api/fridge/:id
router.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    await prisma.fridgeItem.delete({
      where: { id: req.params.id, userId: req.userId! },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

export default router;
