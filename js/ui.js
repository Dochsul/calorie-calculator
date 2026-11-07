// Общие DOM-помощники и форматирование
import { dishTotals } from "./calc.js";
import { PRODUCT_MAP } from "./data.js";

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

export const round = (n) => Math.round(n);

// Полоса прогресса по калориям дня
export function progress(current, target) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const cls = current > target * 1.05 ? "over" : current < target * 0.85 ? "under" : "";
  return `<div class="bar ${cls}"><span style="width:${pct}%"></span></div>`;
}

// Итоги блюда на N порций
export function dishServing(dish, servings) {
  const t = dishTotals(dish);
  const s = parseFloat(servings) || 1;
  return {
    kcal: t.kcal * s,
    p: t.p * s,
    f: t.f * s,
    c: t.c * s,
    cookedMass: t.cookedMass * s,
    rawMass: t.rawMass * s,
  };
}

export function macroLine(t) {
  return `Б ${round(t.p)} · Ж ${round(t.f)} · У ${round(t.c)} г`;
}

export function ingList(dish, servings) {
  return (dish.ingredients || [])
    .map((ing) => {
      const pr = PRODUCT_MAP[ing.productId];
      if (!pr) return "";
      const g = Math.round((parseFloat(ing.grams) || 0) * (parseFloat(servings) || 1));
      const cooked = Math.round(g * pr.yield);
      const tag = pr.yield === 1 ? `${g} г` : `${g} г → ${cooked} г гот.`;
      return `<li>${esc(pr.name)} <span>${tag}</span></li>`;
    })
    .filter(Boolean)
    .join("");
}
