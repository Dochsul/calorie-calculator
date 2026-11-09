// Единая проверка пищевых ограничений Aina Évidence.
// Рекурсивно проверяет все ингредиенты, включая состав комплексных блюд,
// соусов и вложенных рецептов. При медицинских ограничениях блокирует
// несовместимые блюда, проверяет сохранённые меню и запрещает PDF-экспорт
// при выявленных нарушениях. Для продуктов с неизвестным составом
// требует подтверждения безопасности.
import { PRODUCT_MAP, collectTags, collectNames } from "./data.js";

// Читаемые названия тегов для сообщений о нарушениях
const TAG_LABELS = {
  meat: "мясо",
  poultry: "птицу",
  fish: "рыбу",
  seafood: "морепродукты",
  egg: "яйца",
  dairy: "молочные продукты",
  gluten: "глютен",
};

export function tagLabel(tag) {
  return TAG_LABELS[tag] || tag;
}

// Медицинские ограничения: вегетарианство, веганство, без глютена, без молока, аллергии.
// Нелюбимые продукты (dislikes) — предпочтение, не блокируют PDF.
export function isMedical(restrictions) {
  const r = restrictions || {};
  return !!(r.vegetarian || r.vegan || r.glutenFree || r.dairyFree ||
    (r.allergies && String(r.allergies).trim()));
}

// Множество блокируемых тегов из медицинских ограничений
function blockedTags(restrictions) {
  const r = restrictions || {};
  const block = new Set();
  if (r.vegetarian) ["meat", "poultry", "fish", "seafood"].forEach((t) => block.add(t));
  if (r.vegan) ["meat", "poultry", "fish", "seafood", "egg", "dairy"].forEach((t) => block.add(t));
  if (r.glutenFree) block.add("gluten");
  if (r.dairyFree) block.add("dairy");
  return block;
}

// Полностью ли известен состав продукта (все ингредиенты рекурсивно в базе).
export function isKnownComposition(productId, seen = new Set()) {
  if (seen.has(productId)) return true;
  const p = PRODUCT_MAP[productId];
  if (!p) return false;
  seen.add(productId);
  if (p.composite && p.components) {
    return p.components.every((c) => isKnownComposition(c.productId, seen));
  }
  return true;
}

// Проверка одного продукта (с разворотом состава) против ограничений.
// Возвращает { violations, unknown }:
//   violations — нарушения медицинских ограничений (блокировка)
//   unknown    — неизвестный состав (требует подтверждения)
export function checkProduct(productId, restrictions) {
  const r = restrictions || {};
  const violations = [];
  const unknown = [];

  const p = PRODUCT_MAP[productId];
  if (!p) {
    unknown.push({ productId, productName: productId, reason: "Продукт не найден в базе" });
    return { violations, unknown };
  }

  if (!isKnownComposition(productId)) {
    unknown.push({ productId, productName: p.name, reason: "Неизвестный состав ингредиентов" });
  }

  // Продукты из Open Food Facts без определённых тегов требуют подтверждения
  if (p.custom && (!p.tags || p.tags.length === 0)) {
    unknown.push({ productId, productName: p.name, reason: "Теги не определены (Open Food Facts)" });
  }

  // Теги — рекурсивный сбор с разворотом состава
  const block = blockedTags(r);
  const tags = collectTags(productId);
  for (const tag of tags) {
    if (block.has(tag)) {
      violations.push({ productId, productName: p.name, tag, reason: `Содержит ${tagLabel(tag)}` });
    }
  }

  // Аллергии — проверка по названиям ингредиентов (рекурсивно)
  const allergies = String(r.allergies || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allergies.length) {
    const names = collectNames(productId);
    for (const a of allergies) {
      if (names.some((n) => n.includes(a))) {
        violations.push({ productId, productName: p.name, tag: "allergy", reason: `Содержит аллерген: ${a}` });
      }
    }
  }

  return { violations, unknown };
}

// Проверка блюда: все ингредиенты против ограничений.
// ing.confirmedSafe подавляет unknown (но не violations).
export function checkDish(dish, restrictions) {
  const violations = [];
  const unknown = [];
  for (const ing of dish.ingredients || []) {
    const check = checkProduct(ing.productId, restrictions);
    for (const v of check.violations) violations.push({ ...v, grams: ing.grams });
    if (!ing.confirmedSafe) {
      for (const u of check.unknown) unknown.push({ ...u, grams: ing.grams });
    }
  }
  return {
    violations,
    unknown,
    blocked: violations.length > 0,
    needsConfirmation: unknown.length > 0,
  };
}

// Проверка всех блюд в списке — возвращает map dishId → результат.
export function checkDishes(state) {
  const results = {};
  for (const dish of state.dishes || []) {
    results[dish.id] = checkDish(dish, state.restrictions);
  }
  return results;
}

// Проверка сохранённого меню: какие блюда в меню нарушают ограничения.
export function checkMenu(state) {
  const violations = [];
  const unknown = [];
  for (let di = 0; di < (state.menu?.days || []).length; di++) {
    const day = state.menu.days[di];
    for (const meal of day.meals || []) {
      if (!meal.dishId) continue;
      const dish = (state.dishes || []).find((d) => d.id === meal.dishId);
      if (!dish) continue;
      const check = checkDish(dish, state.restrictions);
      for (const v of check.violations) {
        violations.push({ ...v, dishName: dish.name, day: di + 1 });
      }
      for (const u of check.unknown) {
        unknown.push({ ...u, dishName: dish.name, day: di + 1 });
      }
    }
  }
  return {
    violations,
    unknown,
    hasViolations: violations.length > 0,
    hasUnknown: unknown.length > 0,
  };
}
