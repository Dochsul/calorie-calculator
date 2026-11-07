// Экспорт меню в PDF через печать (Сохранить как PDF в браузере)
import { getState, targetCalories } from "./store.js";
import { dishTotals } from "./calc.js";
import { PRODUCT_MAP } from "./data.js";

function shoppingFromState(state) {
  const agg = {};
  for (const day of state.menu.days) {
    for (const meal of day.meals) {
      const dish = state.dishes.find((d) => d.id === meal.dishId);
      if (!dish) continue;
      const serv = parseFloat(meal.servings) || 1;
      for (const ing of dish.ingredients || []) {
        const key = ing.productId;
        agg[key] = (agg[key] || 0) + (parseFloat(ing.grams) || 0) * serv;
      }
    }
  }
  return Object.entries(agg)
    .map(([id, g]) => ({ prod: PRODUCT_MAP[id], grams: g }))
    .filter((x) => x.prod);
}

function buildPrintHtml(state) {
  const cal = targetCalories();
  const days = state.menu.days;
  const list = shoppingFromState(state);
  const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  let daysHtml = "";
  days.forEach((day, di) => {
    let dKcal = 0, dP = 0, dF = 0, dC = 0;
    let mealsHtml = "";
    day.meals.forEach((meal) => {
      const dish = state.dishes.find((d) => d.id === meal.dishId);
      if (!dish) return;
      const serv = parseFloat(meal.servings) || 1;
      const t = dishTotals(dish);
      const sc = { kcal: t.kcal * serv, p: t.p * serv, f: t.f * serv, c: t.c * serv, cookedMass: t.cookedMass * serv };
      dKcal += sc.kcal; dP += sc.p; dF += sc.f; dC += sc.c;
      const ings = (dish.ingredients || [])
        .map((ing) => {
          const pr = PRODUCT_MAP[ing.productId];
          return pr ? `${pr.name} ${Math.round((parseFloat(ing.grams) || 0) * serv)} г` : "";
        })
        .filter(Boolean)
        .join(", ");
      mealsHtml += `
        <div class="pm-meal">
          <div class="pm-mhead">${escapeHtml(dish.name)} <span>· ${Math.round(sc.cookedMass)} г · ${Math.round(sc.kcal)} ккал</span></div>
          <div class="pm-ings">${escapeHtml(ings)}</div>
          <div class="pm-macros">Б ${Math.round(sc.p)} · Ж ${Math.round(sc.f)} · У ${Math.round(sc.c)}</div>
        </div>`;
    });
    daysHtml += `
      <div class="pm-day">
        <h3>День ${di + 1} — ${dayNames[di % 7]}</h3>
        ${mealsHtml}
        <div class="pm-dtotal">Итог за день: ${Math.round(dKcal)} ккал · Б ${Math.round(dP)} г · Ж ${Math.round(dF)} г · У ${Math.round(dC)} г</div>
      </div>`;
  });

  let listHtml = list
    .map((x) => `<li>${escapeHtml(x.prod.name)} — ${Math.round(x.grams)} г (${x.prod.cat})</li>`)
    .join("");

  const client = state.client;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
  <title>Меню AINA Evidence — ${escapeHtml(client.name || "клиент")}</title>
  <style>
    @page { margin: 14mm; }
    body { font: 12px/1.5 system-ui, Arial, sans-serif; color:#1f2933; }
    h1 { font-size: 18px; margin:0 0 4px; }
    h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 1px solid #d7e0ea; padding-bottom: 4px; }
    h3 { font-size: 13px; margin: 12px 0 6px; color:#2f80ed; }
    .pm-meta { color:#5c6b7a; font-size: 12px; margin-bottom: 10px; }
    .pm-day { margin-bottom: 14px; page-break-inside: avoid; }
    .pm-meal { margin: 4px 0 8px 12px; }
    .pm-mhead { font-weight: 600; } .pm-mhead span { font-weight: 400; color:#5c6b7a; }
    .pm-ings { color:#5c6b7a; font-size: 11px; }
    .pm-macros { font-size: 11px; color:#2f80ed; }
    .pm-dtotal { font-weight: 600; margin-top: 4px; background:#f4f8fd; padding:6px 8px; border-radius:6px; }
    .pm-shop { column-count: 2; } .pm-shop li { break-inside: avoid; }
  </style></head><body>
  <h1>Меню AINA Evidence</h1>
  <div class="pm-meta">Клиент: ${escapeHtml(client.name || "—")} · Цель: ${cal} ккал/день · БЖУ 30/30/40</div>
  ${daysHtml}
  <h2>Список покупок</h2>
  <ul class="pm-shop">${listHtml || "<li>—</li>"}</ul>
  </body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

export function exportPDF() {
  const state = getState();
  const html = buildPrintHtml(state);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Разрешите всплывающие окна для экспорта в PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
}
