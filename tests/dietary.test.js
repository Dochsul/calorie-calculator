// Unit-тесты единой проверки пищевых ограничений (dietary.js).
// Покрывают рекурсивный разворот состава комплексных блюд, обнаружение
// нарушений медицинских ограничений, проверку меню и подтверждение
// безопасности для продуктов с неизвестным составом.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMedical,
  isKnownComposition,
  checkProduct,
  checkDish,
  checkDishes,
  checkMenu,
  tagLabel,
} from "../js/dietary.js";
import { collectTags, collectNames, allowedProducts, PRODUCT_MAP } from "../js/data.js";

// ---------- collectTags: рекурсивный сбор тегов ----------
test("collectTags собирает теги базового продукта", () => {
  assert.ok(collectTags("chicken_breast").includes("poultry"));
  assert.ok(collectTags("milk_25").includes("dairy"));
  assert.ok(collectTags("pasta").includes("gluten"));
});

test("collectTags разворачивает состав комплексного блюда до тегов ингредиентов", () => {
  // pancakes_banana содержит egg (тег egg) и milk_25 (тег dairy)
  // верхние теги: ["sweet", "grain"] — без egg/dairy
  const tags = collectTags("pancakes_banana");
  assert.ok(tags.includes("egg"), "панкейки содержат яйцо — тег egg должен быть");
  assert.ok(tags.includes("dairy"), "панкейки содержат молоко — тег dairy должен быть");
  assert.ok(tags.includes("grain"), "панкейки содержат овсянку — тег grain");
});

test("collectTags разворачивает борщ (говядина → meat)", () => {
  const tags = collectTags("borscht");
  assert.ok(tags.includes("meat"), "борщ содержит говядину — тег meat");
  assert.ok(tags.includes("veg"), "борщ содержит овощи — тег veg");
});

test("collectTags возвращает [] для неизвестного продукта", () => {
  assert.deepEqual(collectTags("no_such_product"), []);
});

test("collectTags не зацикливается при циклических ссылках", () => {
  // В текущей базе нет циклов, но защита от циклов должна работать
  const tags = collectTags("soup_chicken");
  assert.ok(tags.includes("poultry"));
  assert.ok(Array.isArray(tags));
});

// ---------- collectNames: рекурсивный сбор названий ----------
test("collectNames собирает названия ингредиентов комплексного блюда", () => {
  const names = collectNames("pancakes_banana");
  assert.ok(names.some((n) => n.includes("яйцо")), "должно быть название яйца");
  assert.ok(names.some((n) => n.includes("молоко")), "должно быть название молока");
  assert.ok(names.some((n) => n.includes("банан")), "должно быть название банана");
});

test("collectNames возвращает [] для неизвестного продукта", () => {
  assert.deepEqual(collectNames("no_such_product"), []);
});

// ---------- isMedical ----------
test("isMedical: true для вегетарианства", () => {
  assert.equal(isMedical({ vegetarian: true }), true);
});

test("isMedical: true для веганства", () => {
  assert.equal(isMedical({ vegan: true }), true);
});

test("isMedical: true для без-глютена", () => {
  assert.equal(isMedical({ glutenFree: true }), true);
});

test("isMedical: true для без-молока", () => {
  assert.equal(isMedical({ dairyFree: true }), true);
});

test("isMedical: true для аллергий", () => {
  assert.equal(isMedical({ allergies: "орехи" }), true);
  assert.equal(isMedical({ allergies: "  " }), false);
});

test("isMedical: false для пустых ограничений и только нелюбимого", () => {
  assert.equal(isMedical({}), false);
  assert.equal(isMedical({ dislikes: "печень" }), false);
  assert.equal(isMedical(null), false);
});

// ---------- isKnownComposition ----------
test("isKnownComposition: true для базового продукта", () => {
  assert.equal(isKnownComposition("chicken_breast"), true);
  assert.equal(isKnownComposition("milk_25"), true);
});

test("isKnownComposition: true для комплексного блюда с известными ингредиентами", () => {
  assert.equal(isKnownComposition("soup_chicken"), true);
  assert.equal(isKnownComposition("pancakes_banana"), true);
});

test("isKnownComposition: false для неизвестного продукта", () => {
  assert.equal(isKnownComposition("no_such_product"), false);
});

// ---------- checkProduct: веганство ----------
test("checkProduct: панкейки банановые блокируются при веганстве (egg + dairy)", () => {
  const { violations } = checkProduct("pancakes_banana", { vegan: true });
  assert.ok(violations.length > 0, "панкейки должны нарушать веганство");
  const tags = violations.map((v) => v.tag);
  assert.ok(tags.includes("egg"), "нарушение: яйцо");
  assert.ok(tags.includes("dairy"), "нарушение: молоко");
});

test("checkProduct: панкейки банановые блокируются при без-молока (dairy)", () => {
  const { violations } = checkProduct("pancakes_banana", { dairyFree: true });
  assert.ok(violations.some((v) => v.tag === "dairy"), "нарушение: молоко");
});

test("checkProduct: овсянка не блокируется при веганстве", () => {
  const { violations } = checkProduct("oats", { vegan: true });
  assert.equal(violations.length, 0);
});

// ---------- checkProduct: вегетарианство ----------
test("checkProduct: куриный суп блокируется при вегетарианстве (poultry)", () => {
  const { violations } = checkProduct("soup_chicken", { vegetarian: true });
  assert.ok(violations.some((v) => v.tag === "poultry"), "суп содержит птицу");
});

test("checkProduct: борщ блокируется при вегетарианстве (meat)", () => {
  const { violations } = checkProduct("borscht", { vegetarian: true });
  assert.ok(violations.some((v) => v.tag === "meat"), "борщ содержит мясо");
});

test("checkProduct: овощной суп не блокируется при вегетарианстве", () => {
  const { violations } = checkProduct("soup_veg", { vegetarian: true });
  assert.equal(violations.length, 0);
});

// ---------- checkProduct: без глютена ----------
test("checkProduct: макароны блокируются при без-глютена", () => {
  const { violations } = checkProduct("pasta", { glutenFree: true });
  assert.ok(violations.some((v) => v.tag === "gluten"));
});

test("checkProduct: сырники блокируются при без-глютена (мука)", () => {
  const { violations } = checkProduct("syrniki", { glutenFree: true });
  assert.ok(violations.some((v) => v.tag === "gluten"), "сырники содержат муку с глютеном");
});

// ---------- checkProduct: аллергии ----------
test("checkProduct: аллергия на молоко блокирует панкейки (содержат молоко)", () => {
  const { violations } = checkProduct("pancakes_banana", { allergies: "молоко" });
  assert.ok(violations.some((v) => v.tag === "allergy"), "аллергия на молоко в составе");
});

test("checkProduct: аллергия на лосось блокирует лосось", () => {
  const { violations } = checkProduct("salmon", { allergies: "лосос" });
  assert.ok(violations.some((v) => v.tag === "allergy"));
});

test("checkProduct: аллергия на орехи блокирует миндаль", () => {
  const { violations } = checkProduct("almond", { allergies: "миндал" });
  assert.ok(violations.some((v) => v.tag === "allergy"));
});

// ---------- checkProduct: неизвестный продукт ----------
test("checkProduct: неизвестный productId даёт unknown", () => {
  const { violations, unknown } = checkProduct("no_such_product", { vegan: true });
  assert.equal(violations.length, 0);
  assert.ok(unknown.length > 0, "неизвестный продукт должен попасть в unknown");
});

test("checkProduct: известный продукт без ограничений — нет нарушений", () => {
  const { violations, unknown } = checkProduct("oats", {});
  assert.equal(violations.length, 0);
  assert.equal(unknown.length, 0);
});

// ---------- checkDish: агрегация ----------
test("checkDish: агрегирует нарушения по всем ингредиентам", () => {
  const dish = {
    ingredients: [
      { productId: "oats", grams: 60 },
      { productId: "milk_25", grams: 150 },
      { productId: "egg", grams: 50 },
    ],
  };
  const { violations, blocked } = checkDish(dish, { vegan: true });
  assert.ok(blocked, "блюдо с молоком и яйцом должно быть заблокировано");
  assert.ok(violations.some((v) => v.tag === "dairy"));
  assert.ok(violations.some((v) => v.tag === "egg"));
});

test("checkDish: комплексное блюдо в ингредиентах разворачивается", () => {
  const dish = {
    ingredients: [{ productId: "pancakes_banana", grams: 150 }],
  };
  const { violations } = checkDish(dish, { dairyFree: true });
  assert.ok(violations.some((v) => v.tag === "dairy"), "панкейки содержат молоко");
});

test("checkDish: confirmedSafe подавляет unknown, но не violations", () => {
  const dish = {
    ingredients: [{ productId: "no_such_product", grams: 100, confirmedSafe: true }],
  };
  const { unknown, violations } = checkDish(dish, { vegan: true });
  assert.equal(unknown.length, 0, "confirmedSafe подавляет unknown");
  // неизвестный продукт не может дать violations (мы не знаем его тегов)
  assert.equal(violations.length, 0);
});

test("checkDish: без confirmedSafe unknown отображается", () => {
  const dish = {
    ingredients: [{ productId: "no_such_product", grams: 100 }],
  };
  const { unknown } = checkDish(dish, {});
  assert.ok(unknown.length > 0);
});

test("checkDish: блюдо без нарушений проходит", () => {
  const dish = {
    ingredients: [
      { productId: "buckwheat", grams: 70 },
      { productId: "broccoli", grams: 120 },
    ],
  };
  const { violations, blocked, needsConfirmation } = checkDish(dish, { vegan: true });
  assert.equal(violations.length, 0);
  assert.equal(blocked, false);
  assert.equal(needsConfirmation, false);
});

// ---------- checkDishes: все блюда ----------
test("checkDishes: возвращает результаты для каждого блюда", () => {
  const state = {
    dishes: [
      { id: "d1", ingredients: [{ productId: "oats", grams: 60 }] },
      { id: "d2", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    ],
    restrictions: { vegetarian: true },
  };
  const results = checkDishes(state);
  assert.equal(Object.keys(results).length, 2);
  assert.equal(results.d1.blocked, false);
  assert.equal(results.d2.blocked, true);
});

// ---------- checkMenu: сохранённое меню ----------
test("checkMenu: находит нарушения в блюдах меню", () => {
  const state = {
    dishes: [
      { id: "d1", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
      { id: "d2", name: "Куриный суп", ingredients: [{ productId: "soup_chicken", grams: 300 }] },
    ],
    restrictions: { vegetarian: true },
    menu: {
      days: [{
        meals: [
          { dishId: "d1", servings: 1 },
          { dishId: "d2", servings: 1 },
        ],
      }],
    },
  };
  const { violations, hasViolations } = checkMenu(state);
  assert.ok(hasViolations, "меню с куриным супом нарушает вегетарианство");
  assert.ok(violations.some((v) => v.dishName === "Куриный суп" && v.tag === "poultry"));
});

test("checkMenu: чистое меню не имеет нарушений", () => {
  const state = {
    dishes: [
      { id: "d1", name: "Овсянка", ingredients: [{ productId: "oats", grams: 60 }] },
    ],
    restrictions: { vegan: true },
    menu: { days: [{ meals: [{ dishId: "d1", servings: 1 }] }] },
  };
  const { hasViolations } = checkMenu(state);
  assert.equal(hasViolations, false);
});

test("checkMenu: пустые слоты (dishId=null) игнорируются", () => {
  const state = {
    dishes: [],
    restrictions: { vegan: true },
    menu: { days: [{ meals: [{ dishId: null, servings: 1 }] }] },
  };
  const { hasViolations } = checkMenu(state);
  assert.equal(hasViolations, false);
});

// ---------- allowedProducts: исправление бага со строками ----------
test("allowedProducts: строковые аллергии через запятую корректно фильтруют", () => {
  // Раньше .map вызывался на строке → TypeError. Теперь split(",") работает.
  const allowed = allowedProducts({ allergies: "лосос, миндал" });
  assert.ok(!allowed.some((p) => p.id === "salmon"), "лосось отфильтрован");
  assert.ok(!allowed.some((p) => p.id === "almond"), "миндаль отфильтрован");
  assert.ok(allowed.some((p) => p.id === "oats"), "овсянка осталась");
});

test("allowedProducts: панкейки банановые отфильтровываются при веганстве", () => {
  const allowed = allowedProducts({ vegan: true });
  assert.ok(!allowed.some((p) => p.id === "pancakes_banana"), "панкейки с яйцом и молоком");
  assert.ok(!allowed.some((p) => p.id === "pancakes_oat"), "овсяные панкейки тоже");
  assert.ok(!allowed.some((p) => p.id === "syrniki"), "сырники с яйцом и молоком");
  assert.ok(allowed.some((p) => p.id === "soup_veg"), "овощной суп подходит");
});

test("allowedProducts: панкейки отфильтровываются при без-молока", () => {
  const allowed = allowedProducts({ dairyFree: true });
  assert.ok(!allowed.some((p) => p.id === "pancakes_banana"), "панкейки содержат молоко");
  assert.ok(!allowed.some((p) => p.id === "syrniki"), "сырники содержат творог (dairy)");
});

test("allowedProducts: аллергия на молоко фильтрует блюда с молоком в составе", () => {
  const allowed = allowedProducts({ allergies: "молоко" });
  assert.ok(!allowed.some((p) => p.id === "pancakes_banana"), "панкейки содержат молоко");
  assert.ok(!allowed.some((p) => p.id === "milk_25"), "молоко отфильтровано");
  assert.ok(allowed.some((p) => p.id === "oats"), "овсянка осталась");
});

test("allowedProducts: dislikes (нелюбимое) фильтрует по названию ингредиента", () => {
  const allowed = allowedProducts({ dislikes: "кури" });
  assert.ok(!allowed.some((p) => p.id === "chicken_breast"), "куриная грудка отфильтрована");
  assert.ok(!allowed.some((p) => p.id === "soup_chicken"), "куриный суп отфильтрован");
  assert.ok(allowed.some((p) => p.id === "oats"), "овсянка осталась");
});

// ---------- tagLabel ----------
test("tagLabel: возвращает читаемое название", () => {
  assert.equal(tagLabel("meat"), "мясо");
  assert.equal(tagLabel("poultry"), "птицу");
  assert.equal(tagLabel("dairy"), "молочные продукты");
  assert.equal(tagLabel("unknown_tag"), "unknown_tag");
});
