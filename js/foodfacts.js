// Интеграция с Open Food Facts API: поиск продуктов и нормализация
// нутриентов в формат базы приложения (kcal, p, f, c на 100 г).
// API поддерживает CORS — вызовы идут напрямую из браузера.
const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

// Поиск продуктов по названию. Возвращает массив нормализованных продуктов.
export async function searchOFF(query) {
  const url = `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Open Food Facts недоступен (" + res.status + ")");
  const data = await res.json();
  return (data.products || [])
    .map(normalize)
    .filter((p) => p.kcal > 0 && p.name && p.name !== "Без названия");
}

// Нормализация продукта из ответа OFF в формат базы приложения.
function normalize(p) {
  const n = p.nutriments || {};
  const kcal = n["energy-kcal_100g"] || (n["energy_100g"] ? n["energy_100g"] / 4.184 : 0);
  const r1 = (v) => Math.round((v || 0) * 10) / 10;
  return {
    id: "off_" + (p.code || p._id || Math.random().toString(36).slice(2, 10)),
    name: p.product_name_ru || p.product_name || p.generic_name || "Без названия",
    cat: "Open Food Facts",
    kcal: Math.round(kcal),
    p: r1(n.proteins_100g),
    f: r1(n.fat_100g),
    c: r1(n.carbohydrates_100g),
    yield: 1.0,
    tags: inferTags(p.categories_tags || p.categories || ""),
    custom: true,
  };
}

// Вывод тегов для проверки пищевых ограничений из категорий OFF.
function inferTags(categories) {
  const tags = [];
  const cat = String(categories).toLowerCase();
  if (/meat|beef|pork|lamb|mutton|sausage/.test(cat)) tags.push("meat");
  if (/poultry|chicken|turkey|duck/.test(cat)) tags.push("poultry");
  if (/fish|salmon|tuna|cod|mackerel/.test(cat)) tags.push("fish");
  if (/seafood|shrimp|crab|squid/.test(cat)) tags.push("seafood");
  if (/egg/.test(cat)) tags.push("egg");
  if (/dairy|milk|cheese|yogurt|cream/.test(cat)) tags.push("dairy");
  if (/gluten|wheat|bread|pasta|flour/.test(cat)) tags.push("gluten");
  if (/nut|almond|walnut|hazelnut|peanut/.test(cat)) tags.push("nut");
  return tags;
}
