// Автоподбор граммовки: когда клиент пишет только список продуктов без весов,
// масштабируем «основные» продукты каждого приёма так, чтобы день попал в цель по ккал.
import { PRODUCT_MAP } from "./data.js";
import { MIN_GRAMS, MAX_GRAMS } from "./parser.js";

// Доля суточных калорий по приёму пищи.
const SHARE = { "Завтрак": 0.27, "Обед": 0.33, "Ужин": 0.27, "Перекус": 0.13, "Полдник": 0.13 };
// Эти категории остаются с исходным весом (овощи, масла, сладкое).
const FIXED_CATS = new Set(["Овощи", "Масла и жиры", "Сладкое"]);
const STEP = 5;           // округление веса, г
const K_MIN = 0.4, K_MAX = 3;

const kcalOf = (ing) => (PRODUCT_MAP[ing.productId].kcal * ing.grams) / 100;

export function fitMeals(meals, targetKcal) {
  const shares = meals.map((m) => SHARE[m.name] || 0.2);
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  return meals.map((meal, i) => {
    const mealTarget = (targetKcal * shares[i]) / sum;
    const ings = meal.ingredients.filter((g) => PRODUCT_MAP[g.productId]);
    const fixed = ings.filter((g) => FIXED_CATS.has(PRODUCT_MAP[g.productId].cat));
    const scalable = ings.filter((g) => !FIXED_CATS.has(PRODUCT_MAP[g.productId].cat));
    const fixedKcal = fixed.reduce((a, g) => a + kcalOf(g), 0);
    const baseKcal = scalable.reduce((a, g) => a + kcalOf(g), 0);
    if (baseKcal <= 0 || !(mealTarget > 0)) return meal;
    const k = Math.min(K_MAX, Math.max(K_MIN, (mealTarget - fixedKcal) / baseKcal));
    return {
      ...meal,
      ingredients: meal.ingredients.map((g) => {
        if (!PRODUCT_MAP[g.productId] || FIXED_CATS.has(PRODUCT_MAP[g.productId].cat)) return g;
        const step = g.productId === "egg" ? 50 : STEP; // яйца — целыми
        let v = Math.round((g.grams * k) / step) * step;
        v = Math.min(MAX_GRAMS, Math.max(Math.max(MIN_GRAMS, step), v));
        return { ...g, grams: v };
      }),
    };
  });
}
