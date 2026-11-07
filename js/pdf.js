// Экспорт меню в PDF через печать (Сохранить как PDF в браузере).
// Премиальный клинический стиль Aina Évidence:
// лесной зелёный #1f4d3f, охра #a9762f, тёплая слоновая кость #f6f2ea.
import { getState, targetCalories } from "./store.js";
import { calcMacros } from "./calc.js";
import { PRODUCT_MAP } from "./data.js";

const GOALS = {
  maintain: "Поддержание веса",
  lose20: "Похудение (дефицит 20%)",
  lose15: "Похудение (дефицит 15%)",
  muscleGain: "Набор мышечной массы",
};

// Брендовая палитра Aina Évidence для приёмов пищи — приглушённые клинические тона
const MEAL_COLORS = {
  "Завтрак": "#a9762f",
  "Обед": "#1f4d3f",
  "Ужин": "#34556a",
  "Перекус": "#7a5f7e",
  "Полдник": "#7a5f7e",
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
  const safeG = Number.isFinite(g) && g > 0 ? g : 0;
  if (!p) return { kcal: 0, p: 0, f: 0, c: 0, cooked: 0, raw: 0 };
  return {
    kcal: (p.kcal * safeG) / 100,
    p: (p.p * safeG) / 100,
    f: (p.f * safeG) / 100,
    c: (p.c * safeG) / 100,
    cooked: safeG * p.yield,
    raw: safeG,
  };
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

export function buildPrintHtml(state) {
  const cal = targetCalories();
  const macros = calcMacros(cal);
  const days = state.menu.days;
  const dishes = state.dishes;
  const client = state.client;
  const name = (client.name || "Клиент").trim();
  const weight = client.weight || "—";
  const height = client.height || "—";
  const goalLabel = GOALS[client.goal] || "Поддержание веса";
  const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

  // — Шапка (премиальный клинический стиль) —
  const headerBanner = `<div class="pdf-head">
    <div class="pdf-head-brand">Aina <em>Évidence</em></div>
    <div class="pdf-head-info">
      <div class="pdf-head-title">Персональный план питания</div>
      <div class="pdf-head-client">${esc(name)} · ${weight} кг · ${height} см</div>
    </div>
    <div class="pdf-head-goal">
      <span class="pdf-head-cal">${cal.toLocaleString("ru-RU")}</span> ккал<br>
      <span class="pdf-head-goallabel">${esc(goalLabel)}</span>
    </div>
  </div>`;

  // — Фокус —
  const focusNote = client.notes ? esc(client.notes) : "Соблюдайте интервалы 2–3 часа и питьевой режим";
  const focusBanner = `<div class="pdf-focus">
    <span class="pdf-focus-label">Фокус периода:</span> ${esc(goalLabel)} · ${focusNote}
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
              <tr class="pdf-subtotal" style="background:${color}1a">
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
        <td class="t-left"><b>ИТОГО ЗА ДЕНЬ</b></td>
        <td>${Math.round(dRaw)}</td><td>${Math.round(dCooked)}</td>
        <td><b>${Math.round(dCooked)} г</b></td><td>—</td>
        <td><b>${r1(dKcal)}</b></td><td><b>${r1(dP)}</b></td><td><b>${r1(dF)}</b></td><td><b>${r1(dC)}</b></td>
      </tr></tbody></table>
    </div>`;

    // — Сравнение с целью —
    const diff = (fact, tgt) => r1(fact - tgt);
    const pct = (grams, kcal) => (kcal > 0 ? Math.round((grams / kcal) * 100) : 0);
    const comparison = `<div class="pdf-comp">
      <div class="pdf-comp-head">Сравнение с целью</div>
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
    <span class="pdf-footer-brand">Aina <em>Évidence</em></span>
    <span class="pdf-footer-note">Соблюдайте питьевой режим 2 л, интервалы 2–3 часа. БЖУ 30/30/40.</span>
  </div>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
  <title>План питания Aina Évidence — ${esc(name)}</title>
  <style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font: 11px/1.5 system-ui, -apple-system, "Segoe UI", Arial, sans-serif; color:#1c2620; margin:0; }
    em { font-style: italic; }

    /* — Шапка — */
    .pdf-head {
      background: #1f4d3f; color: #fff; border-radius: 10px;
      padding: 18px 22px; display: flex; align-items: center; gap: 20px;
    }
    .pdf-head-brand {
      font-family: Georgia, serif; font-size: 22px; font-weight: 400;
      letter-spacing: .5px; white-space: nowrap; border-right: 1px solid rgba(255,255,255,.2);
      padding-right: 20px;
    }
    .pdf-head-brand em { color: #c8954a; font-weight: 400; }
    .pdf-head-info { flex: 1; }
    .pdf-head-title {
      font-family: Georgia, serif; font-size: 14px; opacity: .8;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
    }
    .pdf-head-client { font-size: 13px; font-weight: 600; }
    .pdf-head-goal { text-align: right; font-size: 12px; line-height: 1.6; opacity: .85; }
    .pdf-head-cal { font-family: Georgia, serif; font-size: 22px; font-weight: 700; color: #c8954a; }
    .pdf-head-goallabel { font-size: 11px; }

    /* — Фокус — */
    .pdf-focus {
      background: #f6f2ea; border-left: 4px solid #a9762f; border-radius: 0 8px 8px 0;
      padding: 10px 16px; margin: 12px 0; font-size: 12px; color: #1c2620;
    }
    .pdf-focus-label { font-weight: 700; color: #a9762f; }

    h2 { font-size: 14px; margin: 16px 0 8px; font-family: Georgia, serif; color:#1f4d3f; }
    .pdf-day { page-break-inside: avoid; margin-bottom: 16px; }
    .pdf-day-title { border-bottom: 2px solid #e6dfd2; padding-bottom: 4px; }

    /* — Приём пищи — */
    .pdf-meal { margin: 10px 0; page-break-inside: avoid; }
    .pdf-mhead {
      color:#fff; font-weight:700; font-size:11px; letter-spacing:.6px;
      padding:7px 14px; border-radius:8px 8px 0 0; text-transform:uppercase;
    }

    /* — Таблицы — */
    .pdf-tbl { width:100%; border-collapse:collapse; }
    .pdf-tbl th, .pdf-tbl td { border:1px solid #e6dfd2; padding:5px 7px; text-align:center; }
    .pdf-tbl th { background:#f7f3ea; font-size:10px; color:#6f7d72; font-weight:600; text-transform: uppercase; letter-spacing: .3px; }
    .pdf-tbl .t-left { text-align:left; }
    .pdf-subtotal td { font-size:11px; }

    /* — Итог за день — */
    .pdf-day-total { margin: 12px 0; }
    .pdf-dtotal { background:#1f4d3f; color:#fff; font-weight:700; }
    .pdf-dtotal td { border-color:#1f4d3f; }

    /* — Сравнение с целью — */
    .pdf-comp { margin: 10px 0 14px; page-break-inside: avoid; }
    .pdf-comp-head {
      background:#a9762f; color:#fff; font-weight:700; font-size:11px;
      padding:7px 14px; border-radius:8px 8px 0 0; letter-spacing:.6px; text-transform:uppercase;
      font-family: Georgia, serif;
    }
    .pdf-cmp-row td { background:#1f4d3f; color:#fff; }
    .pdf-cmp-row2 td { background:#34556a; color:#fff; }
    .pdf-cmp-diff td { background:#f7f1e6; font-weight:700; color:#1c2620; }

    /* — Подвал — */
    .pdf-footer {
      background:#f6f2ea; border-top: 2px solid #1f4d3f; color:#1c2620;
      padding:12px 16px; border-radius:0 0 8px 8px; margin-top:14px;
      font-size:11px; line-height:1.5; display: flex; align-items: center; gap: 16px;
    }
    .pdf-footer-brand {
      font-family: Georgia, serif; font-size: 14px; white-space: nowrap;
    }
    .pdf-footer-brand em { color: #a9762f; }
    .pdf-footer-note { opacity: .7; }

    /* — Список покупок — */
    .pdf-shop { margin-top: 18px; page-break-inside: avoid; }
    .pdf-shop-grp { margin-bottom:10px; break-inside: avoid; }
    .pdf-shop-grp b { color:#1f4d3f; font-family: Georgia, serif; font-size: 12px; }
    .pdf-shop-grp ul { column-count: 2; list-style:none; padding:0; margin:6px 0 0; }
    .pdf-shop-grp li { padding:2px 0; border-bottom: 1px dotted #e6dfd2; }
  </style></head><body>
  ${headerBanner}
  ${focusBanner}
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
