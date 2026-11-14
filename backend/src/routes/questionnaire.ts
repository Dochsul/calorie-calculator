import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/questionnaire
router.get("/", async (req: AuthedRequest, res) => {
  const q = await prisma.questionnaire.findUnique({ where: { userId: req.userId! } });
  res.json(q || {});
});

// PUT /api/questionnaire — создать или обновить анкету
router.put("/", async (req: AuthedRequest, res) => {
  try {
    const d = req.body;
    const data = {
      goal: d.goal,
      age: d.age ? parseInt(d.age) : undefined,
      height: d.height ? parseInt(d.height) : undefined,
      weight: d.weight ? parseFloat(d.weight) : undefined,
      gender: d.gender,
      formula: d.formula || "mifflin",
      activityLevel: d.activityLevel,
      mealsPerDay: d.mealsPerDay ? parseInt(d.mealsPerDay) : 4,
      budget: d.budget,
      cookingTime: d.cookingTime ? parseInt(d.cookingTime) : undefined,
      difficultyPref: d.difficultyPref,
      pregnancy: d.pregnancy || false,
      breastfeeding: d.breastfeeding || false,
      cycle: d.cycle || false,
      notes: d.notes,
      customCalories: d.customCalories ? parseInt(d.customCalories) : undefined,
      customProtein: d.customProtein ? parseFloat(d.customProtein) : undefined,
      customFat: d.customFat ? parseFloat(d.customFat) : undefined,
      customCarbs: d.customCarbs ? parseFloat(d.customCarbs) : undefined,
      isChild: d.isChild || false,
      childAgeGroup: d.childAgeGroup,
    };

    const q = await prisma.questionnaire.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, ...data },
      update: data,
    });

    // Сохраняем предпочтения отдельно
    if (d.allergies !== undefined || d.dislikedFoods !== undefined || d.likedFoods !== undefined || d.dietaryTags !== undefined) {
      await prisma.userPreference.upsert({
        where: { userId: req.userId! },
        create: {
          userId: req.userId!,
          allergies: d.allergies || [],
          dislikedFoods: d.dislikedFoods || [],
          likedFoods: d.likedFoods || [],
          dietaryTags: d.dietaryTags || [],
        },
        update: {
          allergies: d.allergies || undefined,
          dislikedFoods: d.dislikedFoods || undefined,
          likedFoods: d.likedFoods || undefined,
          dietaryTags: d.dietaryTags || undefined,
        },
      });
    }

    res.json(q);
  } catch (err) {
    console.error("Questionnaire save error:", err);
    res.status(500).json({ error: "Ошибка сохранения анкеты" });
  }
});

export default router;
