// Расчёт калорийности и КБЖУ.
// Белки: 4 ккал/г, Жиры: 9 ккал/г, Углеводы: 4 ккал/г.
// Проценты рассчитываются по энергетическому вкладу макронутриентов.

import { PRODUCT_MAP } from "./data.js";

export function calcCalories(client) {
  const c = client || {};
  const activity = parseFloat(c.activity) || 1.2;
  let calories;

  if (c.isChild) {
    switch (c.childAgeGroup) {
      case "infant": calories = 800; break;
      case "toddler": calories = 1200; break;
      case "child4_8": calories = 1600; break;
      case "child9_13": calories = c.gender === "male" ? 1800 : 1600; break;
      case "teen14_18": calories = c.gender === "male" ? 2400 : 2000; break;
      default: calories = 1600;
    }
    calories *= activity;
  } else {
    const weight = parseFloat(c.weight) || 0;
    const height = parseFloat(c.height) || 0;
    const age = parseFloat(c.age) || 0;
    let bmr;
    if (c.formula === "harris") {
      bmr = c.gender === "male"
        ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
        : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;
    } else {
      bmr = c.gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    }
    calories = bmr * activity;
    if (c.pregnancy) calories += 300;
    if (c.breastfeeding) calories += 500;
    if (c.cycle) calories += 100;
    if (c.goal === "lose20") calories *= 0.8;
    else if (c.goal === "lose15") calories *= 0.85;
    else if (c.goal === "muscleGain") calories *= 1.15;
  }
  return calories;
}

// Энергетический вклад макронутриентов (ккал)
export function macroEnergy(proteinG, fatG, carbG) {
  return {
    protein: proteinG * 4,
    fat: fatG * 9,
    carb: carbG * 4,
  };
}

// Процентный энергетический вклад каждого макронутриента (сумма = 100%)
export function macroPercents(proteinG, fatG, carbG) {
  const e = macroEnergy(proteinG, fatG, carbG);
  const total = e.protein + e.fat + e.carb;
  if (total <= 0) return { protein: 0, fat: 0, carb: 0, sum: 0 };
  return {
    protein: (e.protein / total) * 100,
    fat: (e.fat / total) * 100,
    carb: (e.carb / total) * 100,
    sum: 100,
  };
}

// Граммы из процентов и калорийности
export function gramsFromPercents(calories, proteinPct, fatPct, carbPct) {
  const sum = proteinPct + fatPct + carbPct;
  if (sum <= 0) return { proteins: 0, fats: 0, carbs: 0 };
  // Нормализуем проценты к 100
  const p = proteinPct / sum;
  const f = fatPct / sum;
  const c = carbPct / sum;
  return {
    proteins: (calories * p) / 4,
    fats: (calories * f) / 9,
    carbs: (calories * c) / 4,
  };
}

// Расчёт БЖУ по умолчанию 30/30/40
export function calcMacros(calories) {
  return {
    proteins: (calories * 0.3) / 4,
    fats: (calories * 0.3) / 9,
    carbs: (calories * 0.4) / 4,
  };
}

// Проверка соответствия граммов БЖУ заявленной калорийности
// Возвращает расхождение в ккал
export function macroCalorieDiscrepancy(calories, proteinG, fatG, carbG) {
  const e = macroEnergy(proteinG, fatG, carbG);
  const actualCalories = e.protein + e.fat + e.carb;
  return {
    actual: Math.round(actualCalories),
    target: Math.round(calories),
    diff: Math.round(actualCalories - calories),
    diffPct: calories > 0 ? Math.round(((actualCalories - calories) / calories) * 100) : 0,
  };
}

// Проверка клинической безопасности
export function validateMacros(calories, proteinG, fatG, carbG, client) {
  const warnings = [];
  const c = client || {};

  if (calories < 1000) warnings.push("Калорийность ниже 1000 ккал — это клинически небезопасно.");
  if (calories < 1200 && !c.isChild) warnings.push("Калорийность ниже 1200 ккал не рекомендуется для взрослых.");
  if (proteinG < 0.8 * (parseFloat(c.weight) || 70))
    warnings.push("Белок ниже 0.8 г/кг массы тела — недостаточно для поддержания мышечной массы.");
  if (fatG < 20) warnings.push("Жиры ниже 20 г — недостаточно для усвоения жирорастворимых витаминов.");
  if (carbG < 50) warnings.push("Углеводы ниже 50 г — кето-режим, требует медицинского контроля.");

  // Несовершеннолетним нельзя худеть стандартным алгоритмом
  if (c.isChild && calories < calcCalories(c) * 0.85)
    warnings.push("Для несовершеннолетних дефицит калорий более 15% небезопасен.");

  const age = parseFloat(c.age) || 30;
  if (age < 18 && c.goal && c.goal.startsWith("lose"))
    warnings.push("Стандартный алгоритм похудения недоступен для несовершеннолетних.");

  return { safe: warnings.length === 0, warnings };
}

// Распределение калорий по приёмам пищи
const DIST = {
  3: [
    { name: "Завтрак", share: 0.30 },
    { name: "Обед", share: 0.40 },
    { name: "Ужин", share: 0.30 },
  ],
  4: [
    { name: "Завтрак", share: 0.3 },
    { name: "Обед", share: 0.35 },
    { name: "Перекус", share: 0.15 },
    { name: "Ужин", share: 0.2 },
  ],
  5: [
    { name: "Завтрак", share: 0.25 },
    { name: "Перекус", share: 0.1 },
    { name: "Обед", share: 0.3 },
    { name: "Полдник", share: 0.15 },
    { name: "Ужин", share: 0.2 },
  ],
};

export function mealPlan(count, calories, macros) {
  const n = [3, 4, 5].includes(count) ? count : 4;
  const m = macros || calcMacros(calories);
  return DIST[n].map((meal) => ({
    name: meal.name,
    kcal: Math.round(calories * meal.share),
    proteins: Math.round(m.proteins * meal.share),
    fats: Math.round(m.fats * meal.share),
    carbs: Math.round(m.carbs * meal.share),
  }));
}

export function mealTimes(firstTime, count, intervalHours) {
  const [h, m] = String(firstTime || "08:00").split(":").map(Number);
  const start = h * 60 + (m || 0);
  const step = (parseFloat(intervalHours) || 3) * 60;
  const n = [3, 4, 5].includes(count) ? count : 4;
  return Array.from({ length: n }, (_, i) => {
    const t = start + step * i;
    const hh = String(Math.floor((t / 60) % 24)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  });
}

// Итоги блюда на 1 порцию из расчёта сырых масс ингредиентов
export function dishTotals(dish) {
  let kcal = 0, p = 0, f = 0, c = 0, cookedMass = 0, rawMass = 0;
  for (const ing of dish.ingredients || []) {
    const prod = PRODUCT_MAP[ing.productId];
    if (!prod) continue;
    const g = parseFloat(ing.grams) || 0;
    rawMass += g;
    cookedMass += g * prod.yield;
    kcal += (prod.kcal * g) / 100;
    p += (prod.p * g) / 100;
    f += (prod.f * g) / 100;
    c += (prod.c * g) / 100;
  }
  return { kcal, p, f, c, cookedMass, rawMass };
}

export const round = (n) => Math.round(n);
export const fmt = (n) => Math.round(n).toLocaleString("ru-RU");
