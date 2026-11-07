// Расчёт калорийности и КБЖУ — портирован из калькулятора index.html
// (dochsul.github.io/calorie-calculator). Без фиксированной 1300 ккал.

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

export function calcMacros(calories) {
  return {
    proteins: (calories * 0.3) / 4,
    fats: (calories * 0.3) / 9,
    carbs: (calories * 0.4) / 4,
  };
}

// Распределение калорий по приёмам пищи
const DIST = {
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

export function mealPlan(count, calories) {
  const n = count === 5 ? 5 : 4;
  return DIST[n].map((m) => ({
    name: m.name,
    kcal: Math.round(calories * m.share),
  }));
}

export function mealTimes(firstTime, count, intervalHours) {
  const [h, m] = String(firstTime || "08:00").split(":").map(Number);
  const start = h * 60 + (m || 0);
  const step = (parseFloat(intervalHours) || 3) * 60;
  const n = count === 5 ? 5 : 4;
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
