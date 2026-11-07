// Unit-тесты функции генерации PDF (pdf.js → buildPrintHtml).
// Проверяют, что в сгенерированном HTML корректно отображаются поля КБЖУ
// и таблицы весов (сырой/сухой, готовый, итог в блюде) после последних изменений.
//
// Примечание: сама функция генерации PDF живёт в js/pdf.js (buildPrintHtml),
// а не в js/report.js — report.js строит экранные таблицы дневника и обращается
// к DOM на верхнем уровне, поэтому не импортируется в node:test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrintHtml } from "../js/pdf.js";
import { targetCalories } from "../js/store.js";
import { calcMacros } from "../js/calc.js";
import { PRODUCT_MAP } from "../js/data.js";

// Локальная копия форматирования и расчёта нутриентов — должна совпадать с pdf.js,
// чтобы проверять, что HTML содержит именно вычисленные значения.
const r1 = (n) => (Math.round(n * 10) / 10).toLocaleString("ru-RU");
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
function mealTotals(ings, serv) {
  let kcal = 0, p = 0, f = 0, c = 0, cooked = 0, raw = 0;
  for (const ing of ings) {
    const g = (parseFloat(ing.grams) || 0) * serv;
    const n = ingNutri(ing.productId, g);
    kcal += n.kcal; p += n.p; f += n.f; c += n.c; cooked += n.cooked; raw += n.raw;
  }
  return { kcal, p, f, c, cooked, raw };
}

function mkState(dishes, meals) {
  return {
    client: { name: "Анна", weight: 70, height: 170, goal: "lose20", notes: "" },
    dishes,
    menu: { days: [{ meals }] },
  };
}

const breakfast = {
  id: "d1", name: "Овсянка с мёдом", category: "Завтрак", note: "",
  ingredients: [
    { productId: "oats", grams: 60 },
    { productId: "honey", grams: 10 },
  ],
};
const lunch = {
  id: "d2", name: "Гречка с курицей", category: "Обед", note: "",
  ingredients: [
    { productId: "buckwheat", grams: 70 },
    { productId: "chicken_breast", grams: 150 },
  ],
};

// ---------- структура PDF ----------
test("buildPrintHtml возвращает полный HTML-документ PDF", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  assert.ok(html.startsWith("<!doctype html>"), "должен начинаться с doctype");
  assert.ok(html.includes("</html>"), "должен закрываться </html>");
  assert.ok(html.includes("Aina"), "бренд в шапке");
});

test("PDF содержит заголовки всех колонок КБЖУ и весов", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  for (const h of ["Вес сырой/сухой", "Вес готовый", "ИТОГО в блюде", "Мера", "Ккал", "Б (г)", "Ж (г)", "У (г)"]) {
    assert.ok(html.includes(h), `отсутствует заголовок колонки: ${h}`);
  }
});

// ---------- КБЖУ ингредиентов (якорные ручные проверки) ----------
test("КБЖУ ингредиента из базы (якорь: овсянка 60 г → 222 / 7,8 / 4,1 / 36)", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  // 370*60/100=222, 13*60/100=7,8, 6,8*60/100=4,08→4,1, 60*60/100=36
  assert.ok(html.includes("<td>222</td><td>7,8</td><td>4,1</td><td>36</td>"), "КБЖУ овсянки");
});

test("КБЖУ ингредиента из базы (якорь: мёд 10 г → 30,4 ккал)", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  assert.ok(html.includes("<td>30,4</td>"), "калорийность мёда 30,4");
});

test("КБЖУ всех ингредиентов совпадают с расчётом ingNutri", () => {
  const html = buildPrintHtml(mkState([breakfast, lunch], [
    { dishId: "d1", servings: 1 },
    { dishId: "d2", servings: 1 },
  ]));
  for (const ing of [...breakfast.ingredients, ...lunch.ingredients]) {
    const n = ingNutri(ing.productId, parseFloat(ing.grams));
    const block = `<td>${r1(n.kcal)}</td><td>${r1(n.p)}</td><td>${r1(n.f)}</td><td>${r1(n.c)}</td>`;
    assert.ok(html.includes(block), `КБЖУ блока для ${ing.productId} отсутствует`);
  }
});

// ---------- таблицы весов ----------
test("Сырой и готовый вес ингредиента отображаются (якорь: овсянка 60 → готовый 150)", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  assert.ok(html.includes("<td>60</td>"), "сырой вес 60");
  assert.ok(html.includes("<td>150</td>"), "готовый вес овсянки 60*2.5=150");
});

test("Итог в блюде (готовый вес) отображается в строке ИТОГО приёма", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  const t = mealTotals(breakfast.ingredients, 1);
  assert.ok(html.includes("ИТОГО ➔ ЗАВТРАК"), "строка итога приёма");
  assert.ok(html.includes(`<b>${Math.round(t.cooked)} г</b>`), "итог готового веса в блюде");
});

// ---------- масштабирование порций ----------
test("КБЖУ и веса масштабируются по числу порций (servings=2)", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 2 }]));
  // 60 г * 2 = 120 г → 370*120/100 = 444 ккал
  assert.ok(html.includes("<td>444</td>"), "калорийность удвоена до 444");
  const n = ingNutri("oats", 120);
  assert.ok(
    html.includes(`<td>${r1(n.kcal)}</td><td>${r1(n.p)}</td><td>${r1(n.f)}</td><td>${r1(n.c)}</td>`),
    "КБЖУ блока для 2 порций"
  );
});

// ---------- некорректный вес ----------
test("Нулевой вес ингредиента даёт нулевые КБЖУ", () => {
  const dish = {
    id: "dz", name: "Пусто", category: "Перекус", note: "",
    ingredients: [{ productId: "oats", grams: 0 }],
  };
  const html = buildPrintHtml(mkState([dish], [{ dishId: "dz", servings: 1 }]));
  assert.ok(html.includes("<td>0</td><td>0</td><td>0</td><td>0</td>"), "нулевые КБЖУ при весе 0");
});

// ---------- итоги за день и сравнение с целью ----------
test("ИТОГО ЗА ДЕНЬ содержит сумму КБЖУ всех приёмов", () => {
  const html = buildPrintHtml(mkState([breakfast, lunch], [
    { dishId: "d1", servings: 1 },
    { dishId: "d2", servings: 1 },
  ]));
  assert.ok(html.includes("ИТОГО ЗА ДЕНЬ"), "строка итога за день");
  const t1 = mealTotals(breakfast.ingredients, 1);
  const t2 = mealTotals(lunch.ingredients, 1);
  const dKcal = t1.kcal + t2.kcal;
  assert.ok(html.includes(`<td><b>${r1(dKcal)}</b></td>`), "суммарная калорийность за день");
});

test("Сравнение с целью: строка Цель содержит калорийность цели и БЖУ", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  const cal = targetCalories();
  const m = calcMacros(cal);
  assert.ok(html.includes("Сравнение с целью"), "блок сравнения");
  assert.ok(
    html.includes(`<td>${cal}</td><td>${r1(m.proteins)}</td><td>${r1(m.fats)}</td><td>${r1(m.carbs)}</td>`),
    "строка Цель: калории и БЖУ цели"
  );
});

test("Сравнение с целью: строка Факт содержит фактические КБЖУ дня", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  assert.ok(html.includes("Факт"), "строка Факт");
  const t = mealTotals(breakfast.ingredients, 1);
  assert.ok(
    html.includes(`<td>${r1(t.kcal)}</td><td>${r1(t.p)}</td><td>${r1(t.f)}</td><td>${r1(t.c)}</td>`),
    "фактические КБЖУ дня"
  );
});

test("Сравнение с целью: строка ± Разница присутствует", () => {
  const html = buildPrintHtml(mkState([breakfast], [{ dishId: "d1", servings: 1 }]));
  assert.ok(html.includes("± Разница"), "строка разницы");
});
