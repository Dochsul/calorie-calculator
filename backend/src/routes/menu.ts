import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthedRequest } from "../middleware/auth.js";
import { generateMenu, replaceDish, type GeneratedMenu } from "../services/menuGenerator.js";
import { calcCalories, calcMacros, mealPlan, getSafetyWarnings, type ClientData } from "../services/nutrition.js";

const router = Router();
router.use(authMiddleware);

// POST /api/menu/generate — составить меню
router.post("/generate", async (req: AuthedRequest, res) => {
  try {
    const { date, days, useFridge } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setDate(targetDate.getDate() + 1); // "на завтра" по умолчанию

    const menus = await generateMenu(req.userId!, targetDate, {
      days: days || 1,
      useFridge: useFridge || false,
    });

    res.json(menus);
  } catch (err) {
    console.error("Menu generation error:", err);
    res.status(500).json({ error: "Ошибка генерации меню" });
  }
});

// POST /api/menu/save — сохранить меню
router.post("/save", async (req: AuthedRequest, res) => {
  try {
    const { menus } = req.body as { menus: GeneratedMenu[] };
    if (!menus || !Array.isArray(menus)) {
      return res.status(400).json({ error: "Укажите массив меню" });
    }

    const saved = [];
    for (const menu of menus) {
      const existing = await prisma.menu.findFirst({
        where: { userId: req.userId!, date: new Date(menu.date) },
      });

      if (existing) {
        const updated = await prisma.menu.update({
          where: { id: existing.id },
          data: { menuData: menu as any, isSaved: true },
        });
        saved.push(updated);
      } else {
        const created = await prisma.menu.create({
          data: {
            userId: req.userId!,
            date: new Date(menu.date),
            menuData: menu as any,
            isSaved: true,
          },
        });
        saved.push(created);
      }
    }

    res.json(saved);
  } catch (err) {
    console.error("Menu save error:", err);
    res.status(500).json({ error: "Ошибка сохранения меню" });
  }
});

// GET /api/menu — история меню
router.get("/", async (req: AuthedRequest, res) => {
  const menus = await prisma.menu.findMany({
    where: { userId: req.userId!, isSaved: true },
    orderBy: { date: "desc" },
    take: 30,
  });
  res.json(menus);
});

// GET /api/menu/:id — конкретное меню
router.get("/:id", async (req: AuthedRequest, res) => {
  const menu = await prisma.menu.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!menu) return res.status(404).json({ error: "Меню не найдено" });
  res.json(menu);
});

// DELETE /api/menu/:id — удалить меню
router.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    await prisma.menu.delete({
      where: { id: req.params.id, userId: req.userId! },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

// POST /api/menu/replace — заменить блюдо
router.post("/replace", async (req: AuthedRequest, res) => {
  try {
    const { menuIndex, mealIndex, simpler, fromFridge } = req.body;
    const newMeal = await replaceDish(req.userId!, menuIndex || 0, mealIndex || 0, {
      simpler: simpler || false,
      fromFridge: fromFridge || false,
    });
    if (!newMeal) return res.status(404).json({ error: "Не удалось подобрать замену" });
    res.json(newMeal);
  } catch (err) {
    console.error("Replace dish error:", err);
    res.status(500).json({ error: "Ошибка замены блюда" });
  }
});

// GET /api/menu/calc — расчёт КБЖУ по анкете
router.get("/calc", async (req: AuthedRequest, res) => {
  const q = await prisma.questionnaire.findUnique({ where: { userId: req.userId! } });
  if (!q) return res.json({ calories: 0, macros: { proteins: 0, fats: 0, carbs: 0 }, warnings: [] });

  const client: ClientData = {
    age: q.age || undefined,
    weight: q.weight || undefined,
    height: q.height || undefined,
    gender: q.gender || undefined,
    formula: q.formula || "mifflin",
    activityLevel: q.activityLevel || "1.2",
    goal: q.goal || "maintain",
    pregnancy: q.pregnancy,
    breastfeeding: q.breastfeeding,
    cycle: q.cycle,
    isChild: q.isChild,
    childAgeGroup: q.childAgeGroup || undefined,
    customCalories: q.customCalories || undefined,
    customProtein: q.customProtein || undefined,
    customFat: q.customFat || undefined,
    customCarbs: q.customCarbs || undefined,
  };

  const calories = calcCalories(client);
  const macros = calcMacros(calories, client);
  const warnings = getSafetyWarnings(client);
  const plan = mealPlan(q.mealsPerDay || 4, calories);

  res.json({ calories, macros, warnings, mealPlan: plan });
});

export default router;
