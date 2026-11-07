// Unit-тесты отображения экрана оплаты (paywall.js) на мобильных устройствах.
// Проверяют, что все брендовые элементы рендерятся корректно и не перекрываются
// при узком viewport: карточка имеет адаптивный отступ, элементы используют
// flex/stream-layout без абсолютного позиционирования, нет фиксированных ширин.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- Моки localStorage / sessionStorage (нет в Node.js) ---
class StorageMock {
  constructor() { this._d = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; }
  setItem(k, v) { this._d[k] = String(v); }
  removeItem(k) { delete this._d[k]; }
  clear() { this._d = {}; }
}
globalThis.localStorage = new StorageMock();
globalThis.sessionStorage = new StorageMock();

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = join(__dirname, "../../css/styles.css");
const css = readFileSync(CSS_PATH, "utf-8");

// --- Минимальный DOM-мок: хватает для renderPaywall ---
// Хранит innerHTML строкой, querySelector ищет по #id / .class / tag.
class MockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.hidden = false;
    this.textContent = "";
    this.value = "";
    this.dataset = {};
    this.onsubmit = null;
    this.onclick = null;
    this.style = {};
  }
}

function makeRoot() {
  const root = {
    _html: "",
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    _find(sel) {
      const html = this._html;
      if (sel.startsWith("#")) {
        const id = sel.slice(1);
        const re = new RegExp(`id=["']${id}["']`);
        return re.test(html) ? new MockElement() : null;
      }
      if (sel.startsWith(".")) {
        const cls = sel.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`class=["'][^"']*\\b${cls}\\b`);
        return re.test(html) ? new MockElement() : null;
      }
      const tag = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`<${tag}[ >]`).test(html) ? new MockElement() : null;
    },
    querySelector(sel) { return this._find(sel); },
    querySelectorAll(sel) {
      if (!sel.startsWith(".")) return [];
      const cls = sel.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`class=["'][^"']*\\b${cls}\\b`, "g");
      const matches = this._html.match(re) || [];
      return matches.map(() => new MockElement());
    },
  };
  return root;
}

// --- Импорт тестируемого модуля (после установки моков) ---
const { renderPaywall } = await import("../views/paywall.js");

// Хелпер: рендерит пейволл и возвращает HTML-строку
function renderPaywallHTML() {
  const root = makeRoot();
  renderPaywall(root);
  return root._html;
}

// Хелпер: проверяет наличие элемента по id в HTML
function hasId(html, id) {
  return new RegExp(`id=["']${id}["']`).test(html);
}
// Хелпер: проверяет наличие класса в HTML
function hasClass(html, cls) {
  return new RegExp(`class=["'][^"']*\\b${cls}\\b`).test(html);
}
// Хелпер: проверяет наличие тега в HTML
function hasTag(html, tag) {
  return new RegExp(`<${tag}[ >]`, "i").test(html);
}

// ========== Рендеринг: все брендовые элементы присутствуют ==========
test("Пейволл рендерит карточку с брендовым логотипом", () => {
  const html = renderPaywallHTML();
  assert.ok(hasClass(html, "pw-card"), "должна быть карточка .pw-card");
  assert.ok(hasClass(html, "pw-brand"), "должен быть бренд .pw-brand");
  assert.ok(hasClass(html, "mark"), "должен быть круг-логотип .mark");
  assert.ok(/Aina/.test(html), "должно быть название 'Aina'");
  assert.ok(/Évidence/.test(html), "должно быть название 'Évidence'");
});

test("Пейволл рендерит подзаголовок и заголовок", () => {
  const html = renderPaywallHTML();
  assert.ok(hasClass(html, "pw-subtitle"), "должен быть подзаголовок .pw-subtitle");
  assert.ok(hasClass(html, "pw-title"), "должен быть заголовок .pw-title");
  assert.ok(/Персональный конструктор меню/i.test(html), "должен быть текст подзаголовка");
});

test("Пейволл рендерит тарифные планы", () => {
  const html = renderPaywallHTML();
  const plans = (html.match(/class=["'][^"']*pw-plan(?:\s|["'])/g) || []).length;
  assert.ok(plans >= 3, `должно быть минимум 3 тарифа .pw-plan, найдено ${plans}`);
  assert.ok(/₽/.test(html), "должен быть символ рубля");
  assert.ok(/990/.test(html), "должна быть цена месяца 990");
  assert.ok(/2490/.test(html), "должна быть цена квартала 2490");
  assert.ok(/7990/.test(html), "должна быть цена года 7990");
  assert.ok(/3 дня бесплатно/.test(html), "должен быть пробный период 3 дня");
});

test("Пейволл рендерит шаги инструкции и форму ввода кода", () => {
  const html = renderPaywallHTML();
  assert.ok(hasClass(html, "pw-steps"), "должен быть блок шагов .pw-steps");
  const steps = (html.match(/class=["'][^"']*pw-step/g) || []).length;
  assert.ok(steps >= 3, `должно быть минимум 3 шага, найдено ${steps}`);
  assert.ok(hasId(html, "pw_form"), "должна быть форма #pw_form");
  assert.ok(hasId(html, "pw_code"), "должен быть input #pw_code");
  assert.ok(hasId(html, "pw_err"), "должен быть блок ошибки #pw_err");
  assert.ok(hasId(html, "pw_admin"), "должна быть кнопка админа #pw_admin");
});

// ========== Мобильная адаптивность: отсутствие перекрытий ==========
test("Карточка пейволла имеет адаптивный отступ для мобильных (media query)", () => {
  // В styles.css должен быть @media (max-width: 600px) с правилом .pw-card
  assert.match(css, /@media\s*\(\s*max-width:\s*600px\s*\)/, "должен быть media query для мобильных");
  const mediaBlock = css.match(/@media\s*\(\s*max-width:\s*600px\s*\)\s*\{[^}]*\.pw-card[^}]*\}/);
  assert.ok(mediaBlock, "в media query должно быть правило .pw-card");
  assert.ok(/padding/.test(mediaBlock[0]), ".pw-card в media query должен менять padding");
});

test("Брендовые элементы пейволла не используют абсолютное позиционирование", () => {
  // Извлекаем все CSS-правила для pw-* классов
  const pwRules = css.match(/\.pw-[a-z]+\s*\{[^}]*\}/g) || [];
  for (const rule of pwRules) {
    assert.ok(!/position:\s*absolute/.test(rule), `правило не должно использовать position:absolute: ${rule.slice(0, 60)}...`);
    assert.ok(!/position:\s*fixed/.test(rule), `правило не должно использовать position:fixed: ${rule.slice(0, 60)}...`);
  }
});

test("В рендеренном HTML нет инлайн-стилей с фиксированной шириной", () => {
  const html = renderPaywallHTML();
  // Ищем style="...width:NNNpx..." — фиксированная ширина может вызвать переполнение на мобильных
  const inlineWidths = html.match(/style=["'][^"']*width:\s*\d+px/gi) || [];
  assert.equal(inlineWidths.length, 0, `не должно быть инлайн width:NNNpx, найдено: ${inlineWidths.join(", ")}`);
});

test("Ценовая плашка использует блочную модель без отрицательных отступов", () => {
  const priceRule = css.match(/\.pw-price\s*\{[^}]*\}/);
  assert.ok(priceRule, "должно быть правило .pw-price");
  assert.ok(!/margin-left:\s*-/.test(priceRule[0]), ".pw-price не должен иметь отрицательный margin-left");
  assert.ok(!/margin-right:\s*-/.test(priceRule[0]), ".pw-price не должен иметь отрицательный margin-right");
  assert.ok(!/margin-top:\s*-/.test(priceRule[0]), ".pw-price не должен иметь отрицательный margin-top");
});

test("Круг-логотип .mark не перекрывает текст бренда (inline-flex, не absolute)", () => {
  const markRule = css.match(/\.pw-brand\s+\.mark\s*\{[^}]*\}/);
  assert.ok(markRule, "должно быть правило .pw-brand .mark");
  assert.ok(/display:\s*inline-flex/.test(markRule[0]), ".mark должен использовать inline-flex");
  assert.ok(!/position:\s*absolute/.test(markRule[0]), ".mark не должен использовать position:absolute");
});

test("Все элементы пейволла вложены в карточку .pw-card", () => {
  const html = renderPaywallHTML();
  // Находим индекс открывающего тега .pw-card и закрывающего
  const cardOpen = html.indexOf('class="pw-card"');
  assert.ok(cardOpen > -1, "должна быть карточка .pw-card");
  // Секция .paywall оборачивает карточку
  assert.ok(hasClass(html, "paywall"), "должна быть секция .paywall");
  // Бренд, цена, форма — все внутри карточки
  const brandIdx = html.indexOf('class="pw-brand"');
  const planIdx = html.indexOf('class="pw-plan');
  const formIdx = html.indexOf('id="pw_form"');
  const adminIdx = html.indexOf('id="pw_admin"');
  assert.ok(brandIdx > cardOpen, "бренд должен быть внутри .pw-card");
  assert.ok(planIdx > cardOpen, "тарифы должны быть внутри .pw-card");
  assert.ok(formIdx > cardOpen, "форма должна быть внутри .pw-card");
  assert.ok(adminIdx > cardOpen, "кнопка админа должна быть внутри .pw-card");
});

test("Форма ввода кода имеет text-align center для читаемости на мобильных", () => {
  const formInputRule = css.match(/\.pw-form\s+input\s*\{[^}]*\}/);
  assert.ok(formInputRule, "должно быть правило .pw-form input");
  assert.ok(/text-align:\s*center/.test(formInputRule[0]), "инпут должен быть центрирован");
  // font-size: 16px предотвращает зум на iOS
  assert.ok(/font-size:\s*16px/.test(formInputRule[0]), "инпут должен иметь font-size: 16px (анти-iOS зум)");
});
