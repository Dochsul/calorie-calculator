// Вкладка «Дневник»: ввод блюд свободным текстом, парсинг и построение
// цветной таблицы питания с итогами и сравнением с целью.
import { getState, update, targetCalories } from "../store.js";
import { calcMacros } from "../calc.js";
import { PRODUCT_MAP } from "../data.js";
import { parseDiary, MIN_GRAMS, MAX_GRAMS, clampInputGrams } from "../parser.js";
import { fitMeals } from "../fit.js";
import { chartsHtml } from "../chart.js";
import { esc } from "../ui.js";

// Тестовый дневник для быстрой проверки парсера и PDF-экспорта без ручного ввода.
// Покрывает: маркеры приёмов пищи, граммовку, меры (ч.л./ст.л./шт), штучные
// продукты (яйцо, банан) и продукты с весом по умолчанию (огурец, помидор, яблоко).
const TEST_DIARY =
  "Завтрак: овсянка 60 г, молоко 150 г, ягоды 100 г, мёд 1 ч.л., яйцо 1 шт\n" +
  "Обед: гречка 70 г, куриная грудка 150 г, огурец, помидор, болгарский перец, оливковое масло 1 ст.л.\n" +
  "Ужин: лосось 150 г, брокколи 120 г, рис 50 г\n" +
  "Перекус: творог 5% 150 г, банан 1 шт, миндаль 15 г, яблоко";

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function dayTotals(meals) {
  let kcal = 0, p = 0, f = 0, c = 0;
  for (const meal of meals)
    for (const ing of meal.ingredients) {
      const n = ingNutri(ing.productId, parseFloat(ing.grams) || 0);
      kcal += n.kcal; p += n.p; f += n.f; c += n.c;
    }
  return { kcal, p, f, c };
}

const MEAL_COLORS = {
  "Завтрак": "#a9762f",
  "Обед": "#1f4d3f",
  "Ужин": "#34556a",
  "Перекус": "#7a5f7e",
  "Полдник": "#7a5f7e",
};

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
  // отрицательный или нечисловой вес обнуляется — калорийность не может быть отрицательной
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

const r1 = (n) => (Math.round(n * 10) / 10).toLocaleString("ru-RU");

export function renderReport(root) {
  const s = getState();
  const d = s.diary;
  const hasMeals = d.meals && d.meals.length;

  root.innerHTML = `
    <section class="card rep-card">
      <div class="rep-header">
        <div class="rep-title">ПЛАН ПИТАНИЯ ${esc((s.client.name || "КЛИЕНТ").toUpperCase())} • ВЕС ${s.client.weight || "—"} КГ</div>
        <div class="rep-goal">~${targetCalories().toLocaleString("ru-RU")} ккал</div>
      </div>
      <div class="rep-input">
        <label>🍽 Опишите что на тарелке — текстом, без весов</label>
        <textarea id="diary_text" rows="6" placeholder="Например:&#10;Завтрак: овсянка 60 г, молоко, ягоды, мёд 1 ч.л., яйцо 1 шт&#10;Обед: гречка, куриная грудка 150 г, салат огурец помидор&#10;Ужин: лосось 150 г, брокколи, рис&#10;Перекус: творог 5%, банан, миндаль 15 г&#10;&#10;Можно без граммовки — кнопка ниже подберёт вес под цель автоматически.">${esc(d.text)}</textarea>
        <div class="rep-actions">
          <label class="rep-date">Дата <input type="date" id="diary_date" value="${d.date || todayStr()}"></label>
          <button class="btn" id="diary_demo" title="Заполнить примером и распарсить">Пример</button>
          <button class="btn" id="diary_parse" title="Разобрать текст в таблицу КБЖУ">📊 Составить таблицу</button>
          <button class="btn primary" id="diary_fit" title="Без весов — подберёт граммовку под калорийность клиента">✨ Составить и подобрать вес под цель</button>
          ${hasMeals ? '<button class="btn" id="diary_save">💾 Сохранить день</button>' : ""}
        </div>
        ${hasMeals ? '<div class="hint">✏️ Граммы можно править прямо в таблице — итоги пересчитаются. ✕ — удалить продукт.</div>' : '<div class="hint">Напишите что ел клиент, нажмите «Составить таблицу» — получите разбивку по КБЖУ.</div>'}
      </div>
      ${hasMeals ? renderTables(s) : '<div class="rep-empty">Нажмите «Составить таблицу», чтобы получить разбивку КБЖУ.</div>'}
    </section>`;

  root.querySelector("#diary_text").oninput = (e) => update((st) => (st.diary.text = e.target.value));
  const demoEl = root.querySelector("#diary_demo");
  if (demoEl) demoEl.onclick = () => {
    update((st) => (st.diary.text = TEST_DIARY));
    const meals = parseDiary(TEST_DIARY);
    update((st) => (st.diary.meals = meals));
    renderReport(root);
  };
  root.querySelector("#diary_parse").onclick = () => {
    const meals = parseDiary(getState().diary.text);
    update((st) => (st.diary.meals = meals));
    renderReport(root);
  };
  root.querySelector("#diary_fit").onclick = () => {
    const meals = fitMeals(parseDiary(getState().diary.text), targetCalories());
    update((st) => (st.diary.meals = meals));
    renderReport(root);
  };
  const dateEl = root.querySelector("#diary_date");
  if (dateEl) dateEl.onchange = (e) => update((st) => (st.diary.date = e.target.value));
  const saveEl = root.querySelector("#diary_save");
  if (saveEl) saveEl.onclick = () => {
    const st = getState();
    const date = st.diary.date || todayStr();
    const t = dayTotals(st.diary.meals);
    update((s) => {
      const h = s.diary.history;
      const i = h.findIndex((x) => x.date === date);
      const entry = { date, kcal: t.kcal, p: t.p, f: t.f, c: t.c };
      if (i >= 0) h[i] = entry; else h.push(entry);
      h.sort((a, b) => (a.date < b.date ? -1 : 1));
    });
    renderReport(root);
  };
  if (hasMeals) bindTables(root);
}

function renderTables(s) {
  let dKcal = 0, dP = 0, dF = 0, dC = 0, dCooked = 0, dRaw = 0;
  const mealsHtml = s.diary.meals.map((meal, mi) => {
    let mKcal = 0, mP = 0, mF = 0, mC = 0, mCooked = 0, mRaw = 0;
    const rows = meal.ingredients.map((ing, ii) => {
      const n = ingNutri(ing.productId, parseFloat(ing.grams) || 0);
      mKcal += n.kcal; mP += n.p; mF += n.f; mC += n.c; mCooked += n.cooked; mRaw += n.raw;
      const pr = PRODUCT_MAP[ing.productId];
      return `<tr>
        <td class="t-left">${pr ? esc(pr.name) : "—"}</td>
        <td><input type="number" min="${MIN_GRAMS}" max="${MAX_GRAMS}" class="dg" value="${ing.grams}" data-mi="${mi}" data-ii="${ii}"></td>
        <td>${r1(n.cooked)}</td>
        <td></td>
        <td>${measureFor(ing.productId, parseFloat(ing.grams) || 0)}</td>
        <td>${r1(n.kcal)}</td><td>${r1(n.p)}</td><td>${r1(n.f)}</td><td>${r1(n.c)}</td>
        <td class="t-center"><button class="btn sm danger" data-rm="${mi}:${ii}">✕</button></td>
      </tr>`;
    }).join("");
    dKcal += mKcal; dP += mP; dF += mF; dC += mC; dCooked += mCooked; dRaw += mRaw;
    const color = MEAL_COLORS[meal.name] || "#1f4d3f";
    return `<div class="rep-meal">
      <div class="rep-meal-head" style="background:${color}">${esc(meal.name.toUpperCase())}</div>
      <table class="rep-table"><thead><tr>
        <th class="t-left">Продукт</th><th>Вес сырой/сухой</th><th>Вес готовый</th><th>Итого в блюде</th><th>Мера</th>
        <th>Ккал</th><th>Б (г)</th><th>Ж (г)</th><th>У (г)</th><th></th>
      </tr></thead><tbody>
        ${rows}
        <tr class="rep-subtotal" style="background:${color}22">
          <td class="t-left"><b>ИТОГО ➔ ${esc(meal.name.toUpperCase())}</b></td>
          <td>${Math.round(mRaw)}</td><td>${Math.round(mCooked)}</td>
          <td><b>${Math.round(mCooked)} г</b></td><td>г/мл</td>
          <td><b>${r1(mKcal)}</b></td><td><b>${r1(mP)}</b></td><td><b>${r1(mF)}</b></td><td><b>${r1(mC)}</b></td><td></td>
        </tr>
      </tbody></table>
    </div>`;
  }).join("");

  const cal = targetCalories();
  const tm = calcMacros(cal);
  const diff = (f, t) => r1(f - t);
  const pct = (grams, kcal) => (kcal > 0 ? Math.round((grams / kcal) * 100) : 0);

  const dailyHtml = `<div class="rep-day-total">
    <table class="rep-table"><tbody><tr class="rep-dtotal">
      <td class="t-left"><b>ИТОГО ЗА ДЕНЬ</b></td>
      <td>${Math.round(dRaw)}</td><td>${Math.round(dCooked)}</td><td><b>${Math.round(dCooked)} г</b></td><td>—</td>
      <td><b>${r1(dKcal)}</b></td><td><b>${r1(dP)}</b></td><td><b>${r1(dF)}</b></td><td><b>${r1(dC)}</b></td><td></td>
    </tr></tbody></table>
  </div>`;

  const compHtml = `<div class="rep-comp">
    <div class="rep-comp-head">СРАВНЕНИЕ С ЦЕЛЬЮ</div>
    <table class="rep-table"><thead><tr>
      <th class="t-left"></th><th>Ккал</th><th>Белки (г)</th><th>Жиры (г)</th><th>Углеводы (г)</th><th>Б %</th><th>Ж %</th><th>У %</th>
    </tr></thead><tbody>
      <tr><td class="t-left"><b>Цель</b></td><td>${cal}</td><td>${r1(tm.proteins)}</td><td>${r1(tm.fats)}</td><td>${r1(tm.carbs)}</td><td>30</td><td>30</td><td>40</td></tr>
      <tr><td class="t-left"><b>Факт</b></td><td>${r1(dKcal)}</td><td>${r1(dP)}</td><td>${r1(dF)}</td><td>${r1(dC)}</td><td>${pct(dP * 4, dKcal)}</td><td>${pct(dF * 9, dKcal)}</td><td>${pct(dC * 4, dKcal)}</td></tr>
      <tr class="rep-diff"><td class="t-left"><b>± Разница</b></td><td>${diff(dKcal, cal)}</td><td>${diff(dP, tm.proteins)}</td><td>${diff(dF, tm.fats)}</td><td>${diff(dC, tm.carbs)}</td><td></td><td></td><td></td></tr>
    </tbody></table>
  </div>`;

  const footerHtml = `<div class="rep-footer">Следите за порциями и интервалами 2–3 часа. БЖУ 30/30/40. Так держать! 💪</div>`;

  const charts = chartsHtml(s.diary.history, cal, tm);
  return mealsHtml + dailyHtml + compHtml + charts + footerHtml;
}

function bindTables(root) {
  root.querySelectorAll(".dg").forEach((inp) => {
    inp.onchange = (e) => {
      const mi = +e.target.dataset.mi, ii = +e.target.dataset.ii;
      const v = clampInputGrams(e.target.value);
      e.target.value = String(v);
      update((s) => (s.diary.meals[mi].ingredients[ii].grams = v));
      renderReport(root);
    };
  });
  root.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => {
    const [mi, ii] = b.dataset.rm.split(":").map(Number);
    update((s) => s.diary.meals[mi].ingredients.splice(ii, 1));
    renderReport(root);
  }));
}
