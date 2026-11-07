// Экспорт меню в PDF через печать (Сохранить как PDF в браузере).
// Макет: цветные шапки приёмов пищи, таблицы КБЖУ, итог за день,
// сравнение с целью и мотивирующий подвал.
import { getState, targetCalories } from "./store.js";
import { calcMacros } from "./calc.js";
import { PRODUCT_MAP } from "./data.js";

const GOALS = {
  maintain: "Поддержание веса",
  lose20: "Похудение (дефицит 20%)",
  lose15: "Похудение (дефицит 15%)",
  muscleGain: "Набор мышечной массы",
};

const MEAL_COLORS = {
  "Завтрак": "#2e7d32",
  "Обед": "#a83232",
  "Ужин": "#2d5a88",
  "Перекус": "#795548",
  "Полдник": "#795548",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

const r1 = (n) => (Math.round(n * 10) / 10).toLocaleString("ru-RU");

function measureFor(id, grams) {
  const p = PRODUCT_MAP[id];
  if (!p) return "—";
  if (id === "egg") return `${Math.max(1, Math.round(grams / 50))} шт`;
  if (id === "olive_oil" || id === "oil_sunflower" || id === "coconut_oil" || id === "butter" || id === "honey")
    return `${Math.max(1, Math.round(grams / 5))} ч.л.`;
  if (id.startsWith("bread")) return `${Math.max(1, Math.round(grams / 35))} ломтик`;
  if (id === "cheese_hard" || id === "mozzarella") return `${Math.max(1, Math.round(grams / 25))} ломтик`;
  if (p.cat === "Фрукты") return `${Math.max(1, Math.round(grams / 150))} шт`;
  return "—";
}

function ingNutri(pid, g) {
  const p = PRODUCT_MAP[pid];
  if (!p) return { kcal: 0, p: 0, f: 0, c: 0, cooked: 0, raw: 0 };
  return {
    kcal: (p.kcal * g) / 100,
    p: (p.p * g) / 100,
    f: (p.f * g) / 100,
    c: (p.c * g) / 100,
    cooked: g * p.yield,
    raw: g,
  };
}

function mealName(meal, dishes) {
  const dish = dishes.find((d) => d.id === meal.dishId);
  return dish ? dish.category || "Приём пищи" : "Приём пищи";
}

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
  const macros = calcMacros(cal);
  const days = state.menu.days;
  const dishes = state.dishes;
  const client = state.client;
  const name = (client.name || "Клиент").trim();
  const weight = client.weight || "—";
  const goalLabel = GOALS[client.goal] || "Поддержание веса";
  const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  // — Шапка —
  const headerBanner = `<div class="pdf-banner pdf-banner-head">
    🌸 ПЛАН ПИТАНИЯ ${esc(name.toUpperCase())} • ВЕС ${weight} КГ 🏆 • ~${cal.toLocaleString("ru-RU")} ккал
  </div>`;

  // — Фокус —
  const focusNote = client.notes ? esc(client.notes) : "Много белка + кардио + планка!";
  const focusBanner = `<div class="pdf-banner pdf-banner-focus">
    🎯 Фокус: ${esc(goalLabel.toUpperCase())} • ${focusNote}
  </div>`;

  // — Прогресс —
  const progressBanner = `<div class="pdf-banner pdf-banner-progress">
    ${esc(name)} | ${weight} кг · Цель: ${esc(goalLabel)} · БЖУ 30/30/40 🏃‍♂️ Продолжаем!
  </div>`;

  // — Мотивация —
  const successBanner = `<div class="pdf-banner pdf-banner-success">
    🏆 МОЛОДЕЦ, ${esc(name.toUpperCase())}! Следите за порциями и интервалами 2–3 часа. Так держать! 😋
  </div>`;

  // — Дни с таблицами —
  let daysHtml = "";
  days.forEach((day, di) => {
    let dKcal = 0, dP = 0, dF = 0, dC = 0, dCooked = 0, dRaw = 0;
    let mealsHtml = "";

    day.meals.forEach((meal, mi) => {
      const dish = dishes.find((d) => d.id === meal.dishId);
      if (!dish) return;
      const serv = parseFloat(meal.servings) || 1;
      let mKcal = 0, mP = 0, mF = 0, mC = 0, mCooked = 0, mRaw = 0;

      const rows = (dish.ingredients || []).map((ing) => {
        const g = (parseFloat(ing.grams) || 0) * serv;
        const n = ingNutri(ing.productId, g);
        mKcal += n.kcal; mP += n.p; mF += n.f; mC += n.c; mCooked += n.cooked; mRaw += n.raw;
        const pr = PRODUCT_MAP[ing.productId];
        return `<tr>
          <td class="t-left">${pr ? esc(pr.name) : "—"}</td>
          <td>${Math.round(g)}</td>
          <td>${r1(n.cooked)}</td>
          <td></td>
          <td>${measureFor(ing.productId, g)}</td>
          <td>${r1(n.kcal)}</td><td>${r1(n.p)}</td><td>${r1(n.f)}</td><td>${r1(n.c)}</td>
        </tr>`;
      }).join("");

      dKcal += mKcal; dP += mP; dF += mF; dC += mC; dCooked += mCooked; dRaw += mRaw;
      const mealTitle = dish.category || "Приём пищи";
      const color = MEAL_COLORS[mealTitle] || "#1f4d3f";
      const sub = `#${color.replace("#", "")}`;
      mealsHtml += `
        <div class="pdf-meal">
          <div class="pdf-mhead" style="background:${color}">${esc(mealTitle.toUpperCase())} — ${esc(dish.name)}</div>
          <table class="pdf-tbl">
            <thead><tr>
              <th class="t-left">Продукт</th><th>Вес сырой/сухой</th><th>Вес готовый (ингр.)</th>
              <th>ИТОГО в блюде (гот. вес)</th><th>Мера</th>
              <th>Ккал</th><th>Б (г)</th><th>Ж (г)</th><th>У (г)</th>
            </tr></thead>
            <tbody>
              ${rows}
              <tr class="pdf-subtotal" style="background:${color}22">
                <td class="t-left"><b>ИТОГО ➔ ${esc(mealTitle.toUpperCase())}</b></td>
                <td>${Math.round(mRaw)}</td><td>${Math.round(mCooked)}</td>
                <td><b>${Math.round(mCooked)} г</b></td><td>г/мл</td>
                <td><b>${r1(mKcal)}</b></td><td><b>${r1(mP)}</b></td><td><b>${r1(mF)}</b></td><td><b>${r1(mC)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>`;
    });

    // — Итог за день —
    const dailyTotal = `<div class="pdf-day-total">
      <table class="pdf-tbl"><tbody><tr class="pdf-dtotal">
        <td class="t-left"><b>✅ ИТОГО ЗА ДЕНЬ</b></td>
        <td>${Math.round(dRaw)}</td><td>${Math.round(dCooked)}</td>
        <td><b>${Math.round(dCooked)} г</b></td><td>—</td>
        <td><b>${r1(dKcal)}</b></td><td><b>${r1(dP)}</b></td><td><b>${r1(dF)}</b></td><td><b>${r1(dC)}</b></td>
      </tr></tbody></table>
    </div>`;

    // — Сравнение с целью —
    const diff = (fact, tgt) => r1(fact - tgt);
    const pct = (grams, kcal) => (kcal > 0 ? Math.round((grams / kcal) * 100) : 0);
    const comparison = `<div class="pdf-comp">
      <div class="pdf-comp-head">📊 СРАВНЕНИЕ С ЦЕЛЬЮ</div>
      <table class="pdf-tbl">
        <thead><tr>
          <th class="t-left"></th><th>Ккал</th><th>Белки (г)</th><th>Жиры (г)</th><th>Углеводы (г)</th>
          <th>Б %</th><th>Ж %</th><th>У %</th>
        </tr></thead>
        <tbody>
          <tr class="pdf-cmp-row"><td class="t-left"><b>Цель</b></td>
            <td>${cal}</td><td>${r1(macros.proteins)}</td><td>${r1(macros.fats)}</td><td>${r1(macros.carbs)}</td>
            <td>30</td><td>30</td><td>40</td></tr>
          <tr class="pdf-cmp-row2"><td class="t-left"><b>Факт</b></td>
            <td>${r1(dKcal)}</td><td>${r1(dP)}</td><td>${r1(dF)}</td><td>${r1(dC)}</td>
            <td>${pct(dP * 4, dKcal)}</td><td>${pct(dF * 9, dKcal)}</td><td>${pct(dC * 4, dKcal)}</td></tr>
          <tr class="pdf-cmp-diff"><td class="t-left"><b>± Разница</b></td>
            <td>${diff(dKcal, cal)}</td><td>${diff(dP, macros.proteins)}</td><td>${diff(dF, macros.fats)}</td><td>${diff(dC, macros.carbs)}</td>
            <td></td><td></td><td></td></tr>
        </tbody>
      </table>
    </div>`;

    const dayLabel = days.length > 1 ? ` — ${dayNames[di % 7]}` : "";
    daysHtml += `
      <div class="pdf-day">
        ${days.length > 1 ? `<h2 class="pdf-day-title">День ${di + 1}${dayLabel}</h2>` : ""}
        ${mealsHtml}
        ${dailyTotal}
        ${comparison}
      </div>`;
  });

  // — Список покупок —
  const list = shoppingFromState(state);
  const shopByCat = {};
  for (const x of list) (shopByCat[x.prod.cat] = shopByCat[x.prod.cat] || []).push(x);
  const shopHtml = list.length
    ? `<div class="pdf-shop"><h2>Список покупок</h2>
        ${Object.entries(shopByCat).map(([cat, items]) => `
          <div class="pdf-shop-grp"><b>${esc(cat)}</b>
          <ul>${items.map((x) => `<li>${esc(x.prod.name)} — ${Math.round(x.grams)} г</li>`).join("")}</ul></div>`).join("")}
      </div>`
    : "";

  // — Подвал —
  const footer = `<div class="pdf-footer">
    🌸 Держитесь, ${esc(name)}! Пейте 2 литра воды, гуляйте 10 000 шагов и не забывайте про планку 30 сек × 3–5 раз. 🧘‍♀️ БЖУ 30/30/40 — идеально для достижения цели. 💪🌸
  </div>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
  <title>План питания Aina Évidence — ${esc(name)}</title>
  <style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body { font: 11px/1.45 system-ui, -apple-system, "Segoe UI", Arial, sans-serif; color:#1c2620; margin:0; }
    h2 { font-size: 13px; margin: 14px 0 6px; font-family: Georgia, serif; color:#1f4d3f; }

    .pdf-banner { color:#fff; padding:8px 14px; border-radius:8px; margin:6px 0; font-weight:600; }
    .pdf-banner-head { background:#7e3c8d; font-size:14px; }
    .pdf-banner-focus { background:#a83232; }
    .pdf-banner-progress { background:#2e7d32; }
    .pdf-banner-success { background:#388e3c; }

    .pdf-day { page-break-inside: avoid; margin-bottom: 14px; }
    .pdf-day-title { border-bottom: 1px solid #ccc; padding-bottom: 3px; }
    .pdf-meal { margin: 8px 0; }
    .pdf-mhead { color:#fff; font-weight:700; font-size:11px; letter-spacing:.6px;
      padding:6px 12px; border-radius:8px 8px 0 0; text-transform:uppercase; }

    .pdf-tbl { width:100%; border-collapse:collapse; }
    .pdf-tbl th, .pdf-tbl td { border:1px solid #d9d2c4; padding:4px 6px; text-align:center; }
    .pdf-tbl th { background:#f7f3ea; font-size:10px; color:#6f7d72; font-weight:600; }
    .pdf-tbl .t-left { text-align:left; }
    .pdf-subtotal td { font-size:11px; }

    .pdf-day-total { margin: 10px 0; }
    .pdf-dtotal { background:#333; color:#fff; font-weight:700; }
    .pdf-dtotal td { border-color:#333; }

    .pdf-comp { margin: 8px 0 12px; }
    .pdf-comp-head { background:#455a64; color:#fff; font-weight:700; font-size:11px;
      padding:6px 12px; border-radius:8px 8px 0 0; letter-spacing:.6px; text-transform:uppercase; }
    .pdf-cmp-row td { background:#37474f; color:#fff; }
    .pdf-cmp-row2 td { background:#5e35b1; color:#fff; }
    .pdf-cmp-diff td { background:#f7f1e6; font-weight:700; }

    .pdf-footer { background:#f6f2ea; color:#1c2620; padding:10px 14px; border-radius:8px; margin-top:10px; font-size:11px; line-height:1.5; }

    .pdf-shop { margin-top: 16px; }
    .pdf-shop-grp { margin-bottom:8px; break-inside: avoid; }
    .pdf-shop-grp b { color:#1f4d3f; }
    .pdf-shop-grp ul { column-count: 2; list-style:none; padding:0; margin:4px 0 0; }
    .pdf-shop-grp li { padding:2px 0; }
  </style></head><body>
  ${headerBanner}
  ${focusBanner}
  ${progressBanner}
  ${successBanner}
  ${daysHtml}
  ${shopHtml}
  ${footer}
  </body></html>`;
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
