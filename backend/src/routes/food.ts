import { Router } from "express";
import prisma from "../lib/prisma.js";
import { optionalAuth, AuthedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/food — все продукты (с поиском)
router.get("/", async (req: AuthedRequest, res) => {
  const q = (req.query.q as string) || "";
  const category = (req.query.category as string) || "";

  const foods = await prisma.food.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        category ? { category } : {},
      ],
    },
    orderBy: { category: "asc" },
  });

  // Группируем по категориям
  const byCat: Record<string, typeof foods> = {};
  for (const f of foods) {
    if (!byCat[f.category]) byCat[f.category] = [];
    byCat[f.category].push(f);
  }
  res.json({ foods, byCategory: byCat, categories: Object.keys(byCat) });
});

// GET /api/food/categories
router.get("/categories", async (_req, res) => {
  const cats = await prisma.food.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  res.json(cats.map((c) => c.category));
});

// GET /api/food/recipes — все рецепты
router.get("/recipes", async (req, res) => {
  const mealType = (req.query.mealType as string) || "";
  const recipes = await prisma.recipe.findMany({
    where: mealType ? { mealType } : {},
    orderBy: { name: "asc" },
  });
  res.json(recipes);
});

export default router;
