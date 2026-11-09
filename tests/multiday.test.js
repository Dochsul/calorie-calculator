// Unit-тесты многодневного меню: проверка корректности индикаторов
// (нарушений и неизвестного состава) при переходе между днями.
// checkMenu должен обходить все дни и атрибутировать каждое нарушение
// правильному дню (day: di+1), чтобы индикаторы в каждом дне отражали
// именно его состав.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMenu, checkDish, checkProduct } from "../js/dietary.js";

// Утилита: построить state с заданными блюдами и многодневным меню.
function makeState(dishes, menuDays, restrictions = {}) {
  return { dishes, restrictions, menu: { days: menuDays } };
}

// ---------- checkMenu: обход нескольких дней ----------
test("checkMenu: нарушения атрибутируются правильному дню (3 дня)", () => {
  const dishes = [
    { id: "d_oat", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
    { id: "d_chicken", name: "Курица", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    { id: "d_salmon", name: "Лосось", ingredients: [{ productId: "salmon", grams: 150 }] },
  ];
  // День 1 — овсянка (ок), День 2 — курица (блок), День 3 — лосось (блок)
  const days = [
    { meals: [{ dishId: "d_oat", servings: 1 }] },
    { meals: [{ dishId: "d_chicken", servings: 1 }] },
    { meals: [{ dishId: "d_salmon", servings: 1 }] },
  ];
  const { violations } = checkMenu(makeState(dishes, days, { vegetarian: true }));
  assert.equal(violations.length, 2, "нарушения в дне 2 и дне 3");
  const day2 = violations.filter((v) => v.day === 2);
  const day3 = violations.filter((v) => v.day === 3);
  assert.equal(day2.length, 1, "день 2 — курица");
  assert.equal(day2[0].dishName, "Курица");
  assert.equal(day2[0].tag, "poultry");
  assert.equal(day3.length, 1, "день 3 — лосось");
  assert.equal(day3[0].dishName, "Лосось");
  assert.equal(day3[0].tag, "fish");
});

test("checkMenu: день без нарушений не попадает в violations", () => {
  const dishes = [
    { id: "d_oat", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
    { id: "d_chicken", name: "Курица", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
  ];
  const days = [
    { meals: [{ dishId: "d_oat", servings: 1 }] },
    { meals: [{ dishId: "d_oat", servings: 1 }] },
    { meals: [{ dishId: "d_chicken", servings: 1 }] },
  ];
  const { violations } = checkMenu(makeState(dishes, days, { vegetarian: true }));
  const daysWithViolations = violations.map((v) => v.day);
  assert.ok(!daysWithViolations.includes(1), "день 1 чист");
  assert.ok(!daysWithViolations.includes(2), "день 2 чист");
  assert.ok(daysWithViolations.includes(3), "день 3 — нарушение");
});

test("checkMenu: нарушение в каждом дне при всеобщем запрете", () => {
  const dishes = [
    { id: "d1", name: "Блюдо 1", ingredients: [{ productId: "chicken_breast", grams: 100 }] },
    { id: "d2", name: "Блюдо 2", ingredients: [{ productId: "salmon", grams: 100 }] },
  ];
  const days = [
    { meals: [{ dishId: "d1", servings: 1 }] },
    { meals: [{ dishId: "d2", servings: 1 }] },
  ];
  const { violations, hasViolations } = checkMenu(makeState(dishes, days, { vegetarian: true }));
  assert.ok(hasViolations);
  assert.equal(violations.length, 2);
  assert.equal(violations[0].day, 1);
  assert.equal(violations[1].day, 2);
});

// ---------- checkMenu: несколько приёмов в дне ----------
test("checkMenu: несколько приёмов в одном дне — все нарушения собраны", () => {
  const dishes = [
    { id: "d_oat", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
    { id: "d_chicken", name: "Курица", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    { id: "d_salmon", name: "Лосось", ingredients: [{ productId: "salmon", grams: 150 }] },
  ];
  const days = [
    { meals: [
      { dishId: "d_oat", servings: 1 },
      { dishId: "d_chicken", servings: 1 },
      { dishId: "d_salmon", servings: 1 },
    ] },
  ];
  const { violations } = checkMenu(makeState(dishes, days, { vegetarian: true }));
  assert.equal(violations.length, 2, "курица + лосось в одном дне");
  assert.ok(violations.every((v) => v.day === 1), "все нарушения — день 1");
});

// ---------- checkMenu: разные ограничения, разные дни ----------
test("checkMenu: веганство ловит яйцо и молоко в разных днях", () => {
  const dishes = [
    { id: "d_egg", name: "Яичница", ingredients: [{ productId: "egg", grams: 100 }] },
    { id: "d_milk", name: "Молоко", ingredients: [{ productId: "milk_25", grams: 200 }] },
    { id: "d_oat", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
  ];
  const days = [
    { meals: [{ dishId: "d_egg", servings: 1 }] },
    { meals: [{ dishId: "d_milk", servings: 1 }] },
    { meals: [{ dishId: "d_oat", servings: 1 }] },
  ];
  const { violations } = checkMenu(makeState(dishes, days, { vegan: true }));
  assert.equal(violations.length, 2);
  const tags = violations.map((v) => v.tag).sort();
  assert.deepEqual(tags, ["dairy", "egg"]);
  assert.equal(violations[0].day, 1, "яйцо — день 1");
  assert.equal(violations[1].day, 2, "молоко — день 2");
});

// ---------- checkMenu: пустые слоты ----------
test("checkMenu: пустые слоты (dishId=null) не дают ложных нарушений ни в каком дне", () => {
  const dishes = [{ id: "d1", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] }];
  const days = [
    { meals: [{ dishId: null, servings: 1 }, { dishId: "d1", servings: 1 }] },
    { meals: [{ dishId: null, servings: 1 }] },
    { meals: [{ dishId: null, servings: 1 }] },
  ];
  const { violations, hasViolations } = checkMenu(makeState(dishes, days, { vegan: true }));
  assert.equal(hasViolations, false);
  assert.equal(violations.length, 0);
});

// ---------- checkMenu: unknown по дням ----------
test("checkMenu: unknown атрибутируется правильному дню", () => {
  const dishes = [
    { id: "d_ok", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
    { id: "d_unk", name: "Неизвестное", ingredients: [{ productId: "no_such", grams: 50 }] },
  ];
  const days = [
    { meals: [{ dishId: "d_ok", servings: 1 }] },
    { meals: [{ dishId: "d_unk", servings: 1 }] },
  ];
  const { unknown, hasUnknown } = checkMenu(makeState(dishes, days, { vegan: true }));
  assert.ok(hasUnknown);
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].day, 2, "unknown — день 2");
  assert.equal(unknown[0].dishName, "Неизвестное");
});

// ---------- checkMenu: изменение ограничений переоценивает все дни ----------
test("checkMenu: снятие вегетарианства убирает все нарушения во всех днях", () => {
  const dishes = [
    { id: "d_chicken", name: "Курица", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    { id: "d_salmon", name: "Лосось", ingredients: [{ productId: "salmon", grams: 150 }] },
  ];
  const days = [
    { meals: [{ dishId: "d_chicken", servings: 1 }] },
    { meals: [{ dishId: "d_salmon", servings: 1 }] },
  ];
  // С вегетарианством — нарушения
  const withRestr = checkMenu(makeState(dishes, days, { vegetarian: true }));
  assert.equal(withRestr.violations.length, 2);
  // Без ограничений — чисто
  const noRestr = checkMenu(makeState(dishes, days, {}));
  assert.equal(noRestr.violations.length, 0);
  assert.equal(noRestr.hasViolations, false);
});

test("checkMenu: смена ограничения меняет набор нарушений по дням", () => {
  const dishes = [
    { id: "d_pasta", name: "Паста", ingredients: [{ productId: "pasta", grams: 100 }] },
    { id: "d_chicken", name: "Курица", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
  ];
  const days = [
    { meals: [{ dishId: "d_pasta", servings: 1 }] },
    { meals: [{ dishId: "d_chicken", servings: 1 }] },
  ];
  // Без глютена: только день 1 (паста)
  const gf = checkMenu(makeState(dishes, days, { glutenFree: true }));
  assert.equal(gf.violations.length, 1);
  assert.equal(gf.violations[0].day, 1);
  assert.equal(gf.violations[0].tag, "gluten");
  // Вегетарианство: только день 2 (курица)
  const veg = checkMenu(makeState(dishes, days, { vegetarian: true }));
  assert.equal(veg.violations.length, 1);
  assert.equal(veg.violations[0].day, 2);
  assert.equal(veg.violations[0].tag, "poultry");
});

// ---------- checkDish: стабильность при повторных вызовах (имитация перехода) ----------
test("checkDish: один и тот же dish даёт одинаковый результат при повторной проверке", () => {
  const dish = {
    ingredients: [{ productId: "chicken_breast", grams: 150 }],
  };
  const r = { vegetarian: true };
  const a = checkDish(dish, r);
  const b = checkDish(dish, r);
  assert.equal(a.blocked, b.blocked);
  assert.equal(a.violations.length, b.violations.length);
  assert.equal(a.needsConfirmation, b.needsConfirmation);
});

// ---------- checkProduct: каждый день независим (нет состояния между вызовами) ----------
test("checkProduct: нет утечки состояния между вызовами для разных дней", () => {
  const r = { vegetarian: true };
  const chicken = checkProduct("chicken_breast", r);
  const oats = checkProduct("oats", r);
  const chicken2 = checkProduct("chicken_breast", r);
  assert.equal(chicken.violations.length, 1);
  assert.equal(oats.violations.length, 0);
  assert.equal(chicken2.violations.length, 1, "повторная проверка — тот же результат");
});

// ---------- 7-дневное меню ----------
test("checkMenu: 7-дневное меню, нарушения только в нужных днях", () => {
  const dishes = [
    { id: "ok1", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
    { id: "bad1", name: "Курица", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    { id: "bad2", name: "Лосось", ingredients: [{ productId: "salmon", grams: 150 }] },
    { id: "ok2", name: "Творог", ingredients: [{ productId: "curd_5", grams: 150 }] },
  ];
  // Чередуем: ок, нарушение, ок, нарушение, ок, нарушение, ок
  const days = [
    { meals: [{ dishId: "ok1", servings: 1 }] },
    { meals: [{ dishId: "bad1", servings: 1 }] },
    { meals: [{ dishId: "ok2", servings: 1 }] },
    { meals: [{ dishId: "bad2", servings: 1 }] },
    { meals: [{ dishId: "ok1", servings: 1 }] },
    { meals: [{ dishId: "bad1", servings: 1 }] },
    { meals: [{ dishId: "ok2", servings: 1 }] },
  ];
  const { violations } = checkMenu(makeState(dishes, days, { vegetarian: true }));
  assert.equal(violations.length, 3);
  const badDays = violations.map((v) => v.day).sort();
  assert.deepEqual(badDays, [2, 4, 6]);
  assert.ok(!badDays.includes(1) && !badDays.includes(3) && !badDays.includes(5) && !badDays.includes(7));
});
