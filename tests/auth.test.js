// Unit-тесты модуля подписки по кодам доступа (auth.js).
// Проверяют, что просроченные и неверные коды блокируют доступ к конструктору меню.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCode, activateCode, isActive, getSubscription, makeCode } from "../js/auth.js";

// --- Мок localStorage / sessionStorage (отсутствуют в Node.js) ---
// auth.js обращается к localStorage только внутри функций, не при импорте,
// поэтому достаточно установить моки до первого вызова.
class StorageMock {
  constructor() { this._d = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; }
  setItem(k, v) { this._d[k] = String(v); }
  removeItem(k) { delete this._d[k]; }
  clear() { this._d = {}; }
}
globalThis.localStorage = new StorageMock();
globalThis.sessionStorage = new StorageMock();

const DAY_MS = 86400000;

// ========== validateCode: валидные коды ==========
test("validateCode принимает корректный сгенерированный код", () => {
  const code = makeCode(30);
  const r = validateCode(code);
  assert.equal(r.ok, true);
  assert.equal(r.days, 30);
});

test("validateCode принимает код с разным сроком (90, 365 дней)", () => {
  for (const days of [90, 365]) {
    const r = validateCode(makeCode(days));
    assert.equal(r.ok, true, `код на ${days} дней должен быть валиден`);
    assert.equal(r.days, days);
  }
});

test("validateCode нормализует пробелы и регистр", () => {
  const code = makeCode(30);
  const r = validateCode("  " + code.toLowerCase() + "  ");
  assert.equal(r.ok, true);
});

// ========== validateCode: неверный формат ==========
test("validateCode отклоняет пустой код", () => {
  assert.equal(validateCode("").ok, false);
  assert.equal(validateCode(null).ok, false);
  assert.equal(validateCode(undefined).ok, false);
});

test("validateCode отклоняет код без префикса AINA-", () => {
  assert.equal(validateCode("30D-ABCDEF-1234").ok, false);
  assert.equal(validateCode("XXXX-30D-ABCDEF-1234").ok, false);
});

test("validateCode отклоняет код с неверной контрольной суммой", () => {
  const code = makeCode(30);
  // Подменяем последние 4 символа (контрольную сумму)
  const tampered = code.slice(0, -4) + "ZZZZ";
  assert.notEqual(tampered, code, "подменённый код должен отличаться");
  const r = validateCode(tampered);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.error, "должно быть сообщение об ошибке");
});

test("validateCode отклоняет код с нулевым сроком", () => {
  // Ручная сборка невалидного кода с days=0
  const r = validateCode("AINA-0D-AAAAAA-XXXX");
  assert.equal(r.ok, false);
});

test("validateCode отклоняет код со слишком большим сроком (>3650 дней)", () => {
  const r = validateCode("AINA-9999D-AAAAAA-XXXX");
  assert.equal(r.ok, false);
});

test("validateCode отклоняет случайную строку", () => {
  assert.equal(validateCode("мусхаджиева").ok, false);
  assert.equal(validateCode("12345678").ok, false);
  assert.equal(validateCode("AINA-30D-short").ok, false);
});

// ========== activateCode: неверные коды не активируют подписку ==========
test("activateCode с неверным форматом не меняет подписку", () => {
  localStorage.clear();
  const before = getSubscription();
  const r = activateCode("НЕВЕРНЫЙ-КОД");
  assert.equal(r.ok, false);
  assert.deepEqual(getSubscription(), before, "подписка не должна измениться");
});

test("activateCode с поддельной контрольной суммой не меняет подписку", () => {
  localStorage.clear();
  const code = makeCode(30);
  const tampered = code.slice(0, -4) + "ZZZZ";
  const r = activateCode(tampered);
  assert.equal(r.ok, false);
  assert.equal(isActive(), false);
});

test("activateCode с пустым кодом не меняет подписку", () => {
  localStorage.clear();
  const r = activateCode("");
  assert.equal(r.ok, false);
  assert.equal(isActive(), false);
});

// ========== isActive: просроченная подписка блокирует доступ ==========
test("isActive возвращает false без активации", () => {
  localStorage.clear();
  assert.equal(isActive(), false);
});

test("isActive возвращает true сразу после активации валидным кодом", () => {
  localStorage.clear();
  const r = activateCode(makeCode(30));
  assert.equal(r.ok, true);
  assert.equal(isActive(), true);
});

test("isActive возвращает false после истечения срока подписки", () => {
  localStorage.clear();
  // Активируем код на 1 день, затем сдвигаем время вперёд на 2 дня
  const r = activateCode(makeCode(1));
  assert.equal(r.ok, true);
  assert.equal(isActive(), true);

  // Симулируем истечение: записываем прошедшую дату в localStorage
  const expiredUntil = Date.now() - 2 * DAY_MS;
  localStorage.setItem("aina_subscription", JSON.stringify({ until: expiredUntil }));
  assert.equal(isActive(), false, "просроченная подписка должна блокировать доступ");
});

test("isActive возвращает false при until = 0", () => {
  localStorage.clear();
  localStorage.setItem("aina_subscription", JSON.stringify({ until: 0 }));
  assert.equal(isActive(), false);
});

// ========== activateCode: продление активной подписки ==========
test("activateCode продлевает подписку от текущего конца, а не от сейчас", () => {
  localStorage.clear();
  // Активируем на 30 дней
  const r1 = activateCode(makeCode(30));
  assert.equal(r1.ok, true);
  const after1 = getSubscription().until;

  // Сразу активируем ещё на 30 дней — должно прибавиться к существующему концу
  const r2 = activateCode(makeCode(30));
  assert.equal(r2.ok, true);
  const after2 = getSubscription().until;

  const diff = after2 - after1;
  assert.ok(
    Math.abs(diff - 30 * DAY_MS) < 5000,
    `продление должно добавить ~30 дней, разница: ${diff / DAY_MS} дней`
  );
});

// ========== Сквозной сценарий: неверный код → доступ закрыт ==========
test("Неверный код не открывает доступ, валидный — открывает", () => {
  localStorage.clear();
  // Попытка с поддельным кодом
  assert.equal(activateCode("AINA-30D-AAAAAA-ZZZZ").ok, false);
  assert.equal(isActive(), false, "поддельный код не должен открывать доступ");

  // Реальный код открывает
  assert.equal(activateCode(makeCode(30)).ok, true);
  assert.equal(isActive(), true, "валидный код должен открывать доступ");
});
