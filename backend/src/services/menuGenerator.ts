// Генератор меню: алгоритм подбора рецептов под калорийные цели и ограничения.
import prisma from "../lib/prisma.js";
import {
  calcCalories, calcMacros, mealPlan, dishNutrition, dayTotals,
  type ClientData, type FoodItem, type NutritionTotals,
} from "./nutrition.js";

export interface GeneratedMeal {
  mealType: string;
  mealName: string;
  recipeId: string;
  recipeName: string;
  servings: number;
  ingredients: { foodId: string; name: string; grams: number }[];
  steps: string[];
  prepTime: number;
  cookTime: number;
  difficulty: string;
  nutrition: NutritionTotals;
}

export interface GeneratedMenu {
  date: string;
  targetCalories: number;
  targetMacros: { proteins: number; fats: number; carbs: number };
  meals: GeneratedMeal[];
  dayTotal: NutritionTotals;
  warnings: string[];
  sources: string[];
}

// Фильтрация рецептов по диетическим ограничениям
function filterRecipes(
  recipes: any[],
  prefs: { dietaryTags?: string[]; allergies?: string[]; dislikedFoods?: string[] },
  foods: Map<string, any>
): any[] {
  const blockTags = new Set<string>();
  const tags = prefs.dietaryTags || [];
  if (tags.includes("vegetarian")) ["meat", "poultry", "fish", "seafood"].forEach((t) => blockTags.add(t));
  if (tags.includes("vegan")) ["meat", "poultry", "fish", "seafood", "egg", "dairy"].forEach((t) => blockTags.add(t));
  if (tags.includes("glutenFree")) blockTags.add("gluten");
  if (tags.includes("dairyFree")) blockTags.add("dairy");

  const allergies = (prefs.allergies || []).map((s) => s.toLowerCase());
  const dislikes = (prefs.dislikedFoods || []).map((s) => s.toLowerCase());

  return recipes.filter((r) => {
    // Проверяем теги рецепта
    if (blockTags.size > 0) {
      const recipeFoodTags = new Set<string>();
      for (const ing of (r.ingredients as { foodId: string; grams: number }[])) {
        const f = foods.get(ing.foodId);
        if (f) f.tags.forEach((t: string) => recipeFoodTags.add(t));
      }
      for (const bt of blockTags) {
        if (recipeFoodTags.has(bt)) return false;
      }
    }

    // Проверяем аллергии и нелюбимые продукты
    for (const ing of (r.ingredients as { foodId: string; grams: number }[])) {
      const f = foods.get(ing.foodId);
      if (!f) continue;
      const name = f.name.toLowerCase();
      if (allergies.some((a) => a && name.includes(a))) return false;
      if (dislikes.some((d) => d && name.includes(d))) return false;
    }

    return true;
  });
}

// Подбор порций для попадания в калорийную цель
function fitServings(
  recipe: any,
  foodMap: Map<string, FoodItem>,
  targetKcal: number
): { servings: number; nutrition: NutritionTotals } {
  // Базовая калорийность на 1 порцию
  const baseNutrition = dishNutrition(recipe.ingredients, foodMap, 1);
  if (baseNutrition.kcal <= 0) return { servings: 1, nutrition: baseNutrition };

  // Рассчитываем порции (от 0.5 до 3)
  let servings = targetKcal / baseNutrition.kcal;
  servings = Math.max(0.5, Math.min(3, servings));
  // Округляем до 0.5
  servings = Math.round(servings * 2) / 2;

  const nutrition = dishNutrition(recipe.ingredients, foodMap, servings);
  return { servings, nutrition };
}

// Выбор лучшего рецепта для слота
function pickRecipe(
  recipes: any[],
  mealType: string,
  foodMap: Map<string, FoodItem>,
  targetKcal: number,
  usedRecipeIds: Set<string>,
  fridgeFoodIds: Set<string> | null
): { recipe: any; servings: number; nutrition: NutritionTotals } | null {
  const candidates = recipes.filter(
    (r) => r.mealType === mealType && !usedRecipeIds.has(r.id)
  );

  if (candidates.length === 0) {
    // Если все рецепты использованы — сбрасываем
    const all = recipes.filter((r) => r.mealType === mealType);
    if (all.length === 0) return null;
    return pickBest(all, foodMap, targetKcal, fridgeFoodIds);
  }

  return pickBest(candidates, foodMap, targetKcal, fridgeFoodIds);
}

function pickBest(
  candidates: any[],
  foodMap: Map<string, FoodItem>,
  targetKcal: number,
  fridgeFoodIds: Set<string> | null
): { recipe: any; servings: number; nutrition: NutritionTotals } | null {
  let best: { recipe: any; servings: number; nutrition: NutritionTotals; score: number } | null = null;

  for (const recipe of candidates) {
    const { servings, nutrition } = fitServings(recipe, foodMap, targetKcal);
    // Оценка: близость к калорийной цели
    const kcalDiff = Math.abs(nutrition.kcal - targetKcal);
    let score = kcalDiff;

    // Бонус за использование продуктов из холодильника
    if (fridgeFoodIds) {
      const recipeFoodIds = (recipe.ingredients as { foodId: string }[]).map((i) => i.foodId);
      const fridgeMatches = recipeFoodIds.filter((id) => fridgeFoodIds.has(id)).length;
      score -= fridgeMatches * 50; // каждый совпадающий продукт даёт бонус
    }

    if (!best || score < best.score) {
      best = { recipe, servings, nutrition, score };
    }
  }

  if (!best) return null;
  return { recipe: best.recipe, servings: best.servings, nutrition: best.nutrition };
}

// Главная функция генерации меню
export async function generateMenu(
  userId: string,
  date: Date,
  options?: { useFridge?: boolean; days?: number }
): Promise<GeneratedMenu[]> {
  const questionnaire = await prisma.questionnaire.findUnique({ where: { userId } });
  const preferences = await prisma.userPreference.findUnique({ where: { userId } });
  const recipes = await prisma.recipe.findMany();
  const foods = await prisma.food.findMany();
  const foodMap = new Map<string, FoodItem>(foods.map((f) => [f.id, f as any]));
  const foodNameMap = new Map<string, string>(foods.map((f) => [f.id, f.name]));

  // Данные клиента
  const client: ClientData = {
    age: questionnaire?.age || undefined,
    weight: questionnaire?.weight || undefined,
    height: questionnaire?.height || undefined,
    gender: questionnaire?.gender || undefined,
    formula: questionnaire?.formula || "mifflin",
    activityLevel: questionnaire?.activityLevel || "1.2",
    goal: questionnaire?.goal || "maintain",
    pregnancy: questionnaire?.pregnancy || false,
    breastfeeding: questionnaire?.breastfeeding || false,
    cycle: questionnaire?.cycle || false,
    isChild: questionnaire?.isChild || false,
    childAgeGroup: questionnaire?.childAgeGroup || undefined,
    customCalories: questionnaire?.customCalories || undefined,
    customProtein: questionnaire?.customProtein || undefined,
    customFat: questionnaire?.customFat || undefined,
    customCarbs: questionnaire?.customCarbs || undefined,
  };

  const targetCalories = calcCalories(client);
  const targetMacros = calcMacros(targetCalories, client);
  const mealsPerDay = questionnaire?.mealsPerDay || 4;
  const plan = mealPlan(mealsPerDay, targetCalories);

  // Фильтрация рецептов
  const allowedRecipes = filterRecipes(
    recipes,
    {
      dietaryTags: preferences?.dietaryTags || [],
      allergies: preferences?.allergies || [],
      dislikedFoods: preferences?.dislikedFoods || [],
    },
    new Map(foods.map((f) => [f.id, f]))
  );

  // Продукты из холодильника
  let fridgeFoodIds: Set<string> | null = null;
  if (options?.useFridge) {
    const fridgeItems = await prisma.fridgeItem.findMany({ where: { userId } });
    fridgeFoodIds = new Set(fridgeItems.map((i) => i.foodId));
  }

  // Источники данных
  const sources = [
    "USDA FoodData Central (США)",
    "CIQUAL/ANSES (Франция)",
    "Mifflin-St Jeor, Am J Clin Nutr, 1990",
  ];

  // Безопасные предупреждения
  const warnings: string[] = [];
  if (client.isChild) warnings.push("Для детей используются возрастные нормы калорийности.");
  if (client.pregnancy) warnings.push("Во время беременности не применяется снижение калорийности.");
  if (client.breastfeeding) warnings.push("При грудном вскармливании не применяется снижение калорийности.");
  warnings.push("Приложение предназначено для информационного планирования питания и не заменяет медицинскую консультацию.");

  const numDays = Math.max(1, Math.min(7, options?.days || 1));
  const menus: GeneratedMenu[] = [];
  const usedRecipeIds = new Set<string>();

  for (let d = 0; d < numDays; d++) {
    const dayDate = new Date(date);
    dayDate.setDate(dayDate.getDate() + d);

    const meals: GeneratedMeal[] = [];

    for (const mealSlot of plan) {
      const mealType = mealSlot.name.includes("Завтрак") ? "breakfast"
        : mealSlot.name.includes("Обед") ? "lunch"
        : mealSlot.name.includes("Ужин") ? "dinner"
        : "snack";

      const picked = pickRecipe(
        allowedRecipes,
        mealType,
        foodMap,
        mealSlot.kcal,
        usedRecipeIds,
        fridgeFoodIds
      );

      if (picked) {
        usedRecipeIds.add(picked.recipe.id);
        const ingredients = (picked.recipe.ingredients as { foodId: string; grams: number }[]).map((ing) => ({
          foodId: ing.foodId,
          name: foodNameMap.get(ing.foodId) || ing.foodId,
          grams: ing.grams * picked.servings,
        }));

        meals.push({
          mealType,
          mealName: mealSlot.name,
          recipeId: picked.recipe.id,
          recipeName: picked.recipe.name,
          servings: picked.servings,
          ingredients,
          steps: picked.recipe.steps,
          prepTime: picked.recipe.prepTime,
          cookTime: picked.recipe.cookTime,
          difficulty: picked.recipe.difficulty,
          nutrition: picked.nutrition,
        });
      }
    }

    // Если для 7-дневного плана использовали все рецепты — сбрасываем
    if (d < numDays - 1 && usedRecipeIds.size >= allowedRecipes.length) {
      usedRecipeIds.clear();
    }

    menus.push({
      date: dayDate.toISOString().split("T")[0],
      targetCalories,
      targetMacros,
      meals,
      dayTotal: dayTotals(meals),
      warnings,
      sources,
    });
  }

  return menus;
}

// Замена одного блюда
export async function replaceDish(
  userId: string,
  menuIndex: number,
  mealIndex: number,
  options?: { simpler?: boolean; fromFridge?: boolean }
): Promise<GeneratedMeal | null> {
  // Загружаем сохранённое меню
  const menus = await prisma.menu.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  if (menus.length === 0) return null;

  const menuData = menus[0].menuData as any[];
  if (!menuData || !menuData[menuIndex] || !menuData[menuIndex].meals[mealIndex]) return null;

  const currentMeal = menuData[menuIndex].meals[mealIndex] as GeneratedMeal;
  const recipes = await prisma.recipe.findMany();
  const foods = await prisma.food.findMany();
  const foodMap = new Map<string, FoodItem>(foods.map((f) => [f.id, f as any]));
  const foodNameMap = new Map<string, string>(foods.map((f) => [f.id, f.name]));

  const preferences = await prisma.userPreference.findUnique({ where: { userId } });
  const allowedRecipes = filterRecipes(
    recipes,
    {
      dietaryTags: preferences?.dietaryTags || [],
      allergies: preferences?.allergies || [],
      dislikedFoods: preferences?.dislikedFoods || [],
    },
    new Map(foods.map((f) => [f.id, f]))
  );

  // Фильтруем по тому же mealType, исключаем текущий рецепт
  let candidates = allowedRecipes.filter(
    (r) => r.mealType === currentMeal.mealType && r.id !== currentMeal.recipeId
  );

  // Если запрошено проще — фильтруем по difficulty
  if (options?.simpler) {
    const simpler = candidates.filter((r) => r.difficulty === "easy" && r.cookTime <= 15);
    if (simpler.length > 0) candidates = simpler;
  }

  if (candidates.length === 0) return null;

  // Выбираем случайный
  const recipe = candidates[Math.floor(Math.random() * candidates.length)];

  let fridgeFoodIds: Set<string> | null = null;
  if (options?.fromFridge) {
    const fridgeItems = await prisma.fridgeItem.findMany({ where: { userId } });
    fridgeFoodIds = new Set(fridgeItems.map((i) => i.foodId));
  }

  const { servings, nutrition } = fitServings(recipe, foodMap, currentMeal.nutrition.kcal || 300);

  const ingredients = (recipe.ingredients as { foodId: string; grams: number }[]).map((ing) => ({
    foodId: ing.foodId,
    name: foodNameMap.get(ing.foodId) || ing.foodId,
    grams: ing.grams * servings,
  }));

  return {
    mealType: currentMeal.mealType,
    mealName: currentMeal.mealName,
    recipeId: recipe.id,
    recipeName: recipe.name,
    servings,
    ingredients,
    steps: recipe.steps,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    nutrition,
  };
}
