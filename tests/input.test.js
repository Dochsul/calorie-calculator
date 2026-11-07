// Unit-тесты функции валидации ввода веса (parser.js → clampInputGrams).
// Проверяют ограничение значения веса диапазоном 1–2000 г:
// некорректные и неположительные значения сбрасываются к минимуму,
// превышающие максимум — к максимуму, корректные проходят как есть.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampInputGrams, MIN_GRAMS, MAX_GRAMS } from "../js/parser.js";

// ---------- границы диапазона ----------
test("clampInputGrams пропускает целые значения внутри диапазона", () => {
  assert.equal(clampInputGrams(1), 1);
  assert.equal(clampInputGrams(100), 100);
  assert.equal(clampInputGrams(500), 500);
  assert.equal(clampInputGrams(1500), 1500);
  assert.equal(clampInputGrams(2000), 2000);
});

test("clampInputGrams сохраняет дробные значения внутри диапазона", () => {
  assert.equal(clampInputGrams(1.5), 1.5);
  assert.equal(clampInputGrams(150.5), 150.5);
  assert.equal(clampInputGrams(1999.9), 1999.9);
});

// ---------- нижняя граница: значения < 1 → MIN_GRAMS ----------
test("clampInputGrams сбрасывает значения ниже 1 к минимуму", () => {
  assert.equal(clampInputGrams(0), MIN_GRAMS);
  assert.equal(clampInputGrams(0.5), MIN_GRAMS);
  assert.equal(clampInputGrams(0.99), MIN_GRAMS);
  assert.equal(clampInputGrams(-50), MIN_GRAMS);
  assert.equal(clampInputGrams(-0.1), MIN_GRAMS);
});

// ---------- верхняя граница: значения > 2000 → MAX_GRAMS ----------
test("clampInputGrams ограничивает значения выше 2000 максимумом", () => {
  assert.equal(clampInputGrams(2000.5), MAX_GRAMS);
  assert.equal(clampInputGrams(2001), MAX_GRAMS);
  assert.equal(clampInputGrams(5000), MAX_GRAMS);
  assert.equal(clampInputGrams(99999), MAX_GRAMS);
});

// ---------- некорректные значения → MIN_GRAMS ----------
test("clampInputGrams сбрасывает некорректные значения к минимуму", () => {
  assert.equal(clampInputGrams(NaN), MIN_GRAMS);
  assert.equal(clampInputGrams(Infinity), MIN_GRAMS);
  assert.equal(clampInputGrams(-Infinity), MIN_GRAMS);
  assert.equal(clampInputGrams(null), MIN_GRAMS);
  assert.equal(clampInputGrams(undefined), MIN_GRAMS);
  assert.equal(clampInputGrams(""), MIN_GRAMS);
  assert.equal(clampInputGrams("abc"), MIN_GRAMS);
});

// ---------- строковые числовые входы (как из поля ввода) ----------
test("clampInputGrams парсит строковые числа", () => {
  assert.equal(clampInputGrams("150"), 150);
  assert.equal(clampInputGrams("0"), MIN_GRAMS);
  assert.equal(clampInputGrams("2500"), MAX_GRAMS);
  assert.equal(clampInputGrams("100г"), 100);
  assert.equal(clampInputGrams("50.5"), 50.5);
});

// ---------- контракт: результат всегда в [MIN_GRAMS, MAX_GRAMS] ----------
test("clampInputGrams всегда возвращает конечное значение в диапазоне 1–2000", () => {
  const samples = [-100, 0, 0.5, 1, 50, 500, 1000, 2000, 2500, 1e6, NaN, Infinity, null, undefined, "abc", ""];
  for (const s of samples) {
    const r = clampInputGrams(s);
    assert.ok(
      Number.isFinite(r) && r >= MIN_GRAMS && r <= MAX_GRAMS,
      `значение ${s} → ${r} вне диапазона [${MIN_GRAMS}, ${MAX_GRAMS}]`
    );
  }
});
