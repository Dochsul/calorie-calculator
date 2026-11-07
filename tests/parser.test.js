// Unit-тесты модуля парсера дневника питания (parser.js).
// Покрывают корректность расчёта веса продуктов по тексту и исключение
// некорректных (отрицательных, нулевых, NaN) значений веса.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDiary, parsePhrase, validGrams, validKcal, validIngredient, MIN_GRAMS, MAX_GRAMS } from "../js/parser.js";
import { PRODUCT_MAP } from "../js/data.js";

// ---------- validGrams: базовая валидация веса ----------
test("validGrams пропускает положительные числа", () => {
  assert.equal(validGrams(1), 1);
  assert.equal(validGrams(150), 150);
  assert.equal(validGrams(0.5), 0.5);
});

test("validGrams отклоняет неположительные и некорректные значения", () => {
  assert.equal(validGrams(0), null);
  assert.equal(validGrams(-50), null);
  assert.equal(validGrams(-0.1), null);
  assert.equal(validGrams(NaN), null);
  assert.equal(validGrams(Infinity), null);
  assert.equal(validGrams("100"), null); // нечисло
  assert.equal(validGrams(undefined), null);
  assert.equal(validGrams(null), null);
});

// ---------- parsePhrase: вес из граммовок ----------
test("parsePhrase распознаёт явную граммовку", () => {
  const ings = parsePhrase("куриная грудка 200 г");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "chicken_breast");
  assert.equal(ings[0].grams, 200);
  assert.ok(ings[0].grams > 0, "вес должен быть положительным");
});

test("parsePhrase распознаёт дробную граммовку", () => {
  const ings = parsePhrase("куриная грудка 120.5 г");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "chicken_breast");
  assert.equal(ings[0].grams, 120.5);
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase подставляет вес по умолчанию при отсутствии количества", () => {
  const ings = parsePhrase("гречка");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "buckwheat");
  assert.equal(ings[0].grams, 70);
  assert.ok(ings[0].grams > 0);
});

// ---------- parsePhrase: вес из мер ----------
test("parsePhrase считает вес по столовой ложке", () => {
  const ings = parsePhrase("мёд 2 ст.л.");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "honey");
  assert.equal(ings[0].grams, 30); // 2 * 15
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase считает вес по чайной ложке", () => {
  const ings = parsePhrase("мёд 1 ч.л.");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "honey");
  assert.equal(ings[0].grams, 5); // 1 * 5
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase считает вес по стакану", () => {
  const ings = parsePhrase("молоко 1 стакан");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "milk_25");
  assert.equal(ings[0].grams, 200); // 1 * 200
  assert.ok(ings[0].grams > 0);
});

// ---------- parsePhrase: штучные продукты ----------
test("parsePhrase считает вес штучного продукта (яйца)", () => {
  const ings = parsePhrase("2 яйца");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "egg");
  assert.equal(ings[0].grams, 100); // 2 * 50
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase считает вес по числу ломтиков", () => {
  const ings = parsePhrase("хлеб ржаной 2 ломтика");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "bread_rye");
  assert.equal(ings[0].grams, 80); // 2 * 40
  assert.ok(ings[0].grams > 0);
});

// ---------- parsePhrase: все веса положительные ----------
test("parsePhrase никогда не возвращает отрицательный или нулевой вес", () => {
  const phrase = "завтрак: 2 яйца, сливочное масло 10 г, помидор, огурец 100 г, хлеб ржаной ломтик";
  const ings = parsePhrase(phrase);
  assert.ok(ings.length > 0, "должны распознаться продукты");
  for (const ing of ings) {
    assert.ok(
      Number.isFinite(ing.grams) && ing.grams > 0,
      `некорректный вес для ${ing.productId}: ${ing.grams}`
    );
  }
});

test("parsePhrase опускает ингредиенты с некорректным весом", () => {
  // Симулируем крайний случай: числовой токен «0» не должен давать нулевой вес.
  // 0 шт → resolveGrams даёт 0, валидатор должен исключить ингредиент.
  const ings = parsePhrase("банан 0 шт");
  // Либо ингредиент исключён, либо его вес принудительно положителен.
  const ban = ings.find((i) => i.productId === "banana");
  if (ban) {
    assert.ok(ban.grams > 0, "нулевое значение веса не должно пройти");
  }
  // Если ban === undefined — ингредиент корректно исключён, тоже допустимо.
});

// ---------- parseDiary: структура и валидация ----------
test("parseDiary разбивает текст на приёмы пищи", () => {
  const text = "Завтрак: 2 яйца, хлеб ржаной ломтик\nОбед: куриная грудка 150 г, гречка\nУжин: лосось 200 г";
  const meals = parseDiary(text);
  assert.ok(meals.length >= 3, "должно быть минимум 3 приёма пищи");
  assert.equal(meals[0].name, "Завтрак");
  assert.equal(meals[1].name, "Обед");
  assert.equal(meals[2].name, "Ужин");
});

test("parseDiary возвращает только положительные веса ингредиентов", () => {
  const text = "Завтрак: творог 150 г, мёд 1 ст.л., 2 яйца\nПерекус: банан";
  const meals = parseDiary(text);
  assert.ok(meals.length > 0);
  for (const meal of meals) {
    assert.ok(meal.ingredients.length > 0, `приём «${meal.name}» без ингредиентов`);
    for (const ing of meal.ingredients) {
      assert.ok(
        Number.isFinite(ing.grams) && ing.grams > 0,
        `некорректный вес ${ing.grams} для ${ing.productId} в «${meal.name}»`
      );
    }
  }
});

test("parseDiary возвращает пустой массив для пустого текста", () => {
  assert.deepEqual(parseDiary(""), []);
  assert.deepEqual(parseDiary(null), []);
  assert.deepEqual(parseDiary("   "), []);
});

test("parseDiary без маркеров приёмов группирует в один перекус", () => {
  const meals = parseDiary("творог 150 г, банан");
  assert.equal(meals.length, 1);
  assert.equal(meals[0].name, "Перекус");
  for (const ing of meals[0].ingredients) {
    assert.ok(ing.grams > 0);
  }
});

// ---------- Дополнительные проверки: калорийность и границы веса ----------

test("validKcal пропускает неотрицательные числа", () => {
  assert.equal(validKcal(0), 0);
  assert.equal(validKcal(150), 150);
  assert.equal(validKcal(0.5), 0.5);
});

test("validKcal отклоняет отрицательные и некорректные значения", () => {
  assert.equal(validKcal(-1), null);
  assert.equal(validKcal(-0.01), null);
  assert.equal(validKcal(NaN), null);
  assert.equal(validKcal(Infinity), null);
  assert.equal(validKcal("100"), null);
  assert.equal(validKcal(undefined), null);
});

test("validIngredient отклоняет отрицательный и нулевой вес", () => {
  assert.equal(validIngredient({ productId: "chicken_breast", grams: -50 }), false);
  assert.equal(validIngredient({ productId: "chicken_breast", grams: 0 }), false);
  assert.equal(validIngredient({ productId: "chicken_breast", grams: NaN }), false);
});

test("validIngredient отклоняет неизвестный продукт", () => {
  assert.equal(validIngredient({ productId: "no_such_product", grams: 100 }), false);
  assert.equal(validIngredient({ productId: undefined, grams: 100 }), false);
});

test("validIngredient принимает корректный ингредиент", () => {
  assert.equal(validIngredient({ productId: "chicken_breast", grams: 150 }), true);
  assert.equal(validIngredient({ productId: "egg", grams: 50 }), true);
});

test("parsePhrase ограничивает вес сверху разумным максимумом", () => {
  const ings = parsePhrase("куриная грудка 99999 г");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "chicken_breast");
  assert.ok(ings[0].grams <= MAX_GRAMS, `вес ${ings[0].grams} превышает максимум ${MAX_GRAMS}`);
  assert.ok(ings[0].grams >= MIN_GRAMS);
});

test("parsePhrase ограничивает вес по штучной мере сверху", () => {
  const ings = parsePhrase("5000 яйца");
  assert.equal(ings.length, 1);
  assert.ok(ings[0].grams <= MAX_GRAMS, `вес ${ings[0].grams} превышает максимум`);
});

// ---------- Комплексные блюда (суп, панкейки, борщ, сырники) ----------

test("parsePhrase распознаёт куриный суп как единую позицию", () => {
  const ings = parsePhrase("куриный суп");
  assert.equal(ings.length, 1, "суп должен быть одной позицией, не суммой ингредиентов");
  assert.equal(ings[0].productId, "soup_chicken");
  assert.ok(ings[0].grams > 0);
  assert.ok(PRODUCT_MAP[ings[0].productId].composite === true, "продукт должен быть отмечен как комплексный");
});

test("parsePhrase распознаёт суп с указанной граммовкой", () => {
  const ings = parsePhrase("куриный суп 350 г");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "soup_chicken");
  assert.equal(ings[0].grams, 350);
});

test("parsePhrase не разбивает суп на отдельные ингредиенты", () => {
  const ings = parsePhrase("куриный суп с картофелем");
  assert.equal(ings.length, 1, "суп с картофелем — одна позиция, не суп + картофель");
  assert.equal(ings[0].productId, "soup_chicken");
  // картофель не должен появиться отдельным ингредиентом
  assert.ok(!ings.some((i) => i.productId === "potato"), "картофель не должен дублироваться");
});

test("parsePhrase различает овощной и куриный суп", () => {
  const veg = parsePhrase("овощной суп");
  assert.equal(veg.length, 1);
  assert.equal(veg[0].productId, "soup_veg");

  const chicken = parsePhrase("куриный суп");
  assert.equal(chicken.length, 1);
  assert.equal(chicken[0].productId, "soup_chicken");
});

test("parsePhrase распознаёт борщ как единое блюдо", () => {
  const ings = parsePhrase("борщ");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "borscht");
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase распознаёт банановые панкейки", () => {
  const ings = parsePhrase("панкейки банановые");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "pancakes_banana");
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase: панкейки без уточнения — овсяные", () => {
  const ings = parsePhrase("панкейки");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "pancakes_oat");
});

test("parsePhrase распознаёт сырники", () => {
  const ings = parsePhrase("сырники");
  assert.equal(ings.length, 1);
  assert.equal(ings[0].productId, "syrniki");
  assert.ok(ings[0].grams > 0);
});

test("parsePhrase: комплексное блюдо и отдельный продукт в одной фразе — только блюдо", () => {
  const ings = parsePhrase("суп с курицей и картофелем");
  assert.equal(ings.length, 1, "комплексное блюдо поглощает всю фразу");
  assert.equal(ings[0].productId, "soup_chicken");
});

test("parseDiary: суп и хлеб в разных строках — обе позиции", () => {
  const meals = parseDiary("Обед: куриный суп\nхлеб ржаной ломтик");
  const allIngs = meals.flatMap((m) => m.ingredients);
  const soup = allIngs.find((i) => i.productId === "soup_chicken");
  const bread = allIngs.find((i) => i.productId === "bread_rye");
  assert.ok(soup, "суп должен распознаться");
  assert.ok(bread, "хлеб должен распознаться отдельно (другая строка)");
});

test("parseDiary: комплексные блюда корректно разделяются по приёмам", () => {
  const meals = parseDiary("Завтрак: панкейки банановые\nОбед: борщ\nУжин: сырники");
  assert.ok(meals.length >= 3);
  const allIngs = meals.flatMap((m) => m.ingredients);
  assert.ok(allIngs.some((i) => i.productId === "pancakes_banana"), "панкейки на завтраке");
  assert.ok(allIngs.some((i) => i.productId === "borscht"), "борщ на обеде");
  assert.ok(allIngs.some((i) => i.productId === "syrniki"), "сырники на ужине");
});

test("parseDiary не пропускает ингредиенты с весом выше максимума как есть", () => {
  const meals = parseDiary("Обед: куриная грудка 50000 г, гречка");
  const breast = meals.flatMap((m) => m.ingredients).find((i) => i.productId === "chicken_breast");
  assert.ok(breast, "куриная грудка должна распознаться");
  assert.ok(breast.grams <= MAX_GRAMS, "вес должен быть ограничен сверху");
  assert.ok(breast.grams > 0);
});
