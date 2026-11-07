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

// ========== Подделка срока в коде: смена дней без обновления контрольной суммы ==========
test("validateCode отклоняет код с подменённым сроком (30→365 дней)", () => {
  const code = makeCode(30);               // AINA-30D-TOKEN-CSUM
  const fake = code.replace("AINA-30D-", "AINA-365D-"); // меняем срок, CSUM остаётся от 30
  assert.notEqual(fake, code);
  const r = validateCode(fake);
  assert.equal(r.ok, false, "подмена срока без обновления контрольной суммы должна блокироваться");
  if (!r.ok) assert.ok(r.error);
});

test("activateCode с подменённым сроком не активирует подписку", () => {
  localStorage.clear();
  const code = makeCode(30);
  const fake = code.replace("AINA-30D-", "AINA-365D-");
  const r = activateCode(fake);
  assert.equal(r.ok, false);
  assert.equal(isActive(), false, "подделка срока не должна открывать доступ");
});

// ========== Недопустимые символы в токене ==========
test("validateCode отклоняет код с символами вне алфавита (0, O, 1, I)", () => {
  // Алфавит ALPH исключает 0/O/1/I — код с такими символами не валиден
  assert.equal(validateCode("AINA-30D-0O1IAB-XXXX").ok, false);
  assert.equal(validateCode("AINA-30D-ABCDEF-1234").ok, false); // цифры в токене не входят в ALPH
});

test("validateCode отклоняет код со строчными буквами в токене (до нормализации)", () => {
  // Строчные буквы нормализуются toUpperCase, но "l" не в ALPH (исключены I/L? — нет, L есть)
  // Проверяем реально недопустимый символ — строчная "o" → "O" нет в ALPH
  const r = validateCode("AINA-30D-ABCDEO-XXXX");
  assert.equal(r.ok, false);
});

// ========== Неверный формат: лишние/недостающие сегменты ==========
test("validateCode отклоняет код с лишним сегментом", () => {
  const code = makeCode(30);
  const extra = code + "-EXTRA";
  assert.equal(validateCode(extra).ok, false);
});

test("validateCode отклоняет код с недостающим сегментом", () => {
  const code = makeCode(30);
  // Убираем контрольную сумму
  const missing = code.slice(0, code.lastIndexOf("-"));
  assert.equal(validateCode(missing).ok, false);
});

test("validateCode отклоняет код с двойными дефисами", () => {
  const code = makeCode(30);
  const doubled = code.replace("-", "--", 1);
  assert.equal(validateCode(doubled).ok, false);
});

// ========== Несколько неверных попыток подряд не активируют подписку ==========
test("Серия неверных кодов не открывает доступ", () => {
  localStorage.clear();
  const badCodes = [
    "AINA-30D-AAAAAA-ZZZZ",           // поддельная контрольная сумма
    "НЕВЕРНЫЙ-КОД",                     // совсем другой формат
    "AINA-30D-ABCDEFO-XXXX",           // недопустимый символ O
    "AINA-0D-AAAAAA-XXXX",             // нулевой срок
    "",                                 // пустой код
    "AINA-30D-AB-XXXX",                 // короткий токен
    "AINA-30D-ABCDEFGH-XXXX",           // длинный токен
  ];
  for (const bad of badCodes) {
    const r = activateCode(bad);
    assert.equal(r.ok, false, `код «${bad}» не должен активировать подписку`);
    assert.equal(isActive(), false, `после кода «${bad}» доступ должен быть закрыт`);
  }
});

// ========== Повторная активация после истечения: новый срок от сейчас ==========
test("Повторная активация после истечения начинает срок заново, а не от старой даты", () => {
  localStorage.clear();
  // Активируем на 30 дней
  activateCode(makeCode(30));
  const firstUntil = getSubscription().until;

  // Симулируем истечение — записываем прошедшую дату
  const expiredAt = Date.now() - 10 * DAY_MS;
  localStorage.setItem("aina_subscription", JSON.stringify({ until: expiredAt }));
  assert.equal(isActive(), false, "просроченная подписка должна блокировать доступ");

  // Активируем новый код на 30 дней — срок должен начаться от сейчас, а не от expiredAt
  const r = activateCode(makeCode(30));
  assert.equal(r.ok, true);
  const newUntil = getSubscription().until;
  const expectedMin = Date.now();
  const expectedMax = Date.now() + 31 * DAY_MS;
  assert.ok(newUntil > expiredAt + 30 * DAY_MS, "новый срок не должен отсчитываться от истёкшей даты");
  assert.ok(newUntil >= expectedMin && newUntil <= expectedMax, "новый срок должен начинаться от текущего момента");
});

// ========== Граничный случай: подписка истекает ровно сейчас ==========
test("isActive возвращает false, когда until равно текущему моменту", () => {
  localStorage.clear();
  localStorage.setItem("aina_subscription", JSON.stringify({ until: Date.now() }));
  assert.equal(isActive(), false, "until = now уже считается истёкшей (строгое сравнение >)");
});

// ========== Повреждённый localStorage не открывает доступ ==========
test("isActive возвращает false при повреждённой записи подписки", () => {
  localStorage.clear();
  localStorage.setItem("aina_subscription", "это не JSON");
  assert.equal(isActive(), false, "повреждённая запись не должна открывать доступ");
});

test("isActive возвращает false при отсутствии поля until", () => {
  localStorage.clear();
  localStorage.setItem("aina_subscription", JSON.stringify({ foo: "bar" }));
  assert.equal(isActive(), false);
});

test("isActive возвращает false при строковом until (не число)", () => {
  localStorage.clear();
  localStorage.setItem("aina_subscription", JSON.stringify({ until: "не-число" }));
  assert.equal(isActive(), false);
});

// ========== Полный сценарий блокировки: истёкшая подписка → доступ закрыт ==========
test("Истёкшая подписка полностью блокирует доступ к конструктору", () => {
  localStorage.clear();
  // Активируем на 30 дней
  assert.equal(activateCode(makeCode(30)).ok, true);
  assert.equal(isActive(), true, "подписка активна");

  // Симулируем истечение
  localStorage.setItem("aina_subscription", JSON.stringify({ until: Date.now() - 1 }));
  assert.equal(isActive(), false, "после истечения доступ должен быть закрыт");

  // Валидный код снова открывает
  assert.equal(activateCode(makeCode(30)).ok, true);
  assert.equal(isActive(), true, "новый валидный код должен снова открыть доступ");
});

// ========== Сет кодов с разными сроками: все валидны ==========
test("Коды на разные сроки (1, 7, 30, 90, 365 дней) все проходят валидацию", () => {
  for (const days of [1, 7, 30, 90, 365]) {
    const r = validateCode(makeCode(days));
    assert.equal(r.ok, true, `код на ${days} дней должен быть валиден`);
    assert.equal(r.days, days);
  }
});

// ========== activateCode: валидный код после серии неудач работает ==========
test("Валидный код активирует подписку после серии неудачных попыток", () => {
  localStorage.clear();
  activateCode("AINA-30D-AAAAAA-ZZZZ");
  activateCode("неверный");
  activateCode("");
  assert.equal(isActive(), false);
  assert.equal(activateCode(makeCode(30)).ok, true);
  assert.equal(isActive(), true, "валидный код должен работать после неудачных попыток");
});
