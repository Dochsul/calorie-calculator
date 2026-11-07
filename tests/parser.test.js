// Unit-тесты модуля парсера дневника питания (parser.js).
// Покрывают корректность расчёта веса продуктов по тексту и исключение
// некорректных (отрицательных, нулевых, NaN) значений веса.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDiary, parsePhrase, validGrams } from "../js/parser.js";

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
