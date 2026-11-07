import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDiary } from "../js/parser.js";
import { fitMeals } from "../js/fit.js";
import { PRODUCT_MAP } from "../js/data.js";

const TEXT =
  "Завтрак яйца жареные на слив масле. Огурец помидор хлеб\n" +
  "Обед макароны с куриной грудкой. Тушить грудку на растит или слив масле с луком Макароны варить. Салат огурец помидор болгарский перец лук\n" +
  "Ужин каша кукурузная с слив маслом и творогом 2% и яйцо вареное\n" +
  "Перекус шоколад молочный . Яблоко";

const total = (meals) => meals.reduce((a, m) => a + m.ingredients.reduce((s, g) => s + (PRODUCT_MAP[g.productId].kcal * g.grams) / 100, 0), 0);

test("парсер понимает сообщения без граммовок", () => {
  const meals = parseDiary(TEXT);
  assert.deepEqual(meals.map((m) => m.name), ["Завтрак", "Обед", "Ужин", "Перекус"]);
  const ids = meals[2].ingredients.map((g) => g.productId);
  assert.ok(ids.includes("corn_groats") && ids.includes("curd_2") && ids.includes("butter") && ids.includes("egg"));
});

test("кефир 1% и мацарелла распознаются", () => {
  const ids = parseDiary("Завтрак панкейки яйцо кефир 1% цельнозерновая мука. Обед сыр мацарелла")
    .flatMap((m) => m.ingredients.map((g) => g.productId));
  assert.ok(ids.includes("kefir_1") && ids.includes("flour_ww") && ids.includes("mozzarella"));
});

test("fitMeals подбирает день близко к цели", () => {
  const fitted = fitMeals(parseDiary(TEXT), 1500);
  const t = total(fitted);
  assert.ok(Math.abs(t - 1500) < 200, `итого ${t}`);
  fitted.forEach((m) => m.ingredients.forEach((g) => assert.ok(g.grams >= 1 && g.grams <= 2000)));
});
