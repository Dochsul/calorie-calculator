// База продуктов: нутриенты на 100 г в сухом/сыром виде.
// yield — коэффициент выхода готовой массы к сырой (готовая = сырая * yield).
export const PRODUCTS = [
  // Злаки и крупы (сухие)
  { id: "rice_white", name: "Рис белый", cat: "Злаки и крупы", kcal: 330, p: 7, f: 0.6, c: 73, yield: 3.0, tags: ["grain"] },
  { id: "rice_brown", name: "Рис бурый", cat: "Злаки и крупы", kcal: 340, p: 7.5, f: 2.7, c: 73, yield: 3.0, tags: ["grain"] },
  { id: "buckwheat", name: "Гречка", cat: "Злаки и крупы", kcal: 330, p: 12.6, f: 3.3, c: 62, yield: 3.0, tags: ["grain"] },
  { id: "oats", name: "Овсяные хлопья", cat: "Злаки и крупы", kcal: 370, p: 13, f: 6.8, c: 60, yield: 2.5, tags: ["grain"] },
  { id: "bulgur", name: "Булгур", cat: "Злаки и крупы", kcal: 340, p: 12, f: 1.3, c: 76, yield: 2.8, tags: ["grain"] },
  { id: "millet", name: "Пшено", cat: "Злаки и крупы", kcal: 340, p: 11, f: 3, c: 70, yield: 3.0, tags: ["grain"] },
  { id: "quinoa", name: "Киноа", cat: "Злаки и крупы", kcal: 370, p: 14, f: 6, c: 64, yield: 3.0, tags: ["grain"] },
  // Макаронные изделия
  { id: "pasta", name: "Макароны", cat: "Макаронные изделия", kcal: 350, p: 12, f: 1.5, c: 70, yield: 2.2, tags: ["grain", "gluten"] },
  { id: "pasta_ww", name: "Макароны цельнозерновые", cat: "Макаронные изделия", kcal: 350, p: 14, f: 2, c: 65, yield: 2.2, tags: ["grain", "gluten"] },
  // Бобовые (сухие)
  { id: "lentil", name: "Чечевица", cat: "Бобовые", kcal: 300, p: 24, f: 1.5, c: 47, yield: 2.8, tags: ["legume"] },
  { id: "chickpea", name: "Нут", cat: "Бобовые", kcal: 360, p: 19, f: 6, c: 61, yield: 2.5, tags: ["legume"] },
  { id: "beans_red", name: "Фасоль красная", cat: "Бобовые", kcal: 300, p: 21, f: 1.6, c: 47, yield: 2.5, tags: ["legume"] },
  // Мясо
  { id: "beef_lean", name: "Говядина постная", cat: "Мясо", kcal: 187, p: 26, f: 8.5, c: 0, yield: 0.75, tags: ["meat"] },
  { id: "pork_lean", name: "Свинина постная", cat: "Мясо", kcal: 242, p: 27, f: 14, c: 0, yield: 0.75, tags: ["meat"] },
  // Птица
  { id: "chicken_breast", name: "Куриная грудка", cat: "Птица", kcal: 113, p: 23.6, f: 1.9, c: 0, yield: 0.78, tags: ["poultry"] },
  { id: "chicken_thigh", name: "Куриное бедро", cat: "Птица", kcal: 175, p: 21, f: 9, c: 0, yield: 0.78, tags: ["poultry"] },
  { id: "turkey", name: "Индейка (филе)", cat: "Птица", kcal: 114, p: 23, f: 1.5, c: 0, yield: 0.8, tags: ["poultry"] },
  // Рыба
  { id: "salmon", name: "Лосось", cat: "Рыба", kcal: 208, p: 20, f: 13, c: 0, yield: 0.8, tags: ["fish"] },
  { id: "cod", name: "Треска", cat: "Рыба", kcal: 82, p: 17.8, f: 0.7, c: 0, yield: 0.8, tags: ["fish"] },
  { id: "tuna_can", name: "Тунец консервированный", cat: "Рыба", kcal: 116, p: 26, f: 1, c: 0, yield: 1.0, tags: ["fish"] },
  { id: "pollock", name: "Минтай", cat: "Рыба", kcal: 72, p: 16, f: 1, c: 0, yield: 0.8, tags: ["fish"] },
  // Морепродукты
  { id: "shrimp", name: "Креветки", cat: "Морепродукты", kcal: 95, p: 20, f: 1.7, c: 0.2, yield: 0.85, tags: ["seafood"] },
  { id: "squid", name: "Кальмар", cat: "Морепродукты", kcal: 92, p: 18, f: 1.2, c: 2, yield: 0.8, tags: ["seafood"] },
  // Яйца
  { id: "egg", name: "Яйцо куриное", cat: "Яйца", kcal: 155, p: 13, f: 11, c: 1.1, yield: 1.0, tags: ["egg"] },
  { id: "egg_white", name: "Яичный белок", cat: "Яйца", kcal: 52, p: 11, f: 0.2, c: 0.7, yield: 1.0, tags: ["egg"] },
  // Молочные
  { id: "curd_5", name: "Творог 5%", cat: "Молочные", kcal: 121, p: 17, f: 5, c: 1.8, yield: 1.0, tags: ["dairy"] },
  { id: "curd_0", name: "Творог обезжиренный", cat: "Молочные", kcal: 85, p: 18, f: 0.6, c: 1.3, yield: 1.0, tags: ["dairy"] },
  { id: "milk_25", name: "Молоко 2.5%", cat: "Молочные", kcal: 52, p: 2.9, f: 2.5, c: 4.7, yield: 1.0, tags: ["dairy"] },
  { id: "greek_yogurt", name: "Греческий йогурт", cat: "Молочные", kcal: 59, p: 10, f: 0.4, c: 3.2, yield: 1.0, tags: ["dairy"] },
  { id: "cheese_hard", name: "Сыр твёрдый", cat: "Молочные", kcal: 350, p: 25, f: 27, c: 0, yield: 1.0, tags: ["dairy"] },
  { id: "mozzarella", name: "Моцарелла", cat: "Молочные", kcal: 280, p: 28, f: 18, c: 0, yield: 1.0, tags: ["dairy"] },
  // Овощи
  { id: "tomato", name: "Помидор", cat: "Овощи", kcal: 18, p: 0.9, f: 0.2, c: 3.9, yield: 1.0, tags: ["veg"] },
  { id: "cucumber", name: "Огурец", cat: "Овощи", kcal: 15, p: 0.7, f: 0.1, c: 3.6, yield: 1.0, tags: ["veg"] },
  { id: "broccoli", name: "Брокколи", cat: "Овощи", kcal: 34, p: 2.8, f: 0.4, c: 7, yield: 0.85, tags: ["veg"] },
  { id: "cauliflower", name: "Цветная капуста", cat: "Овощи", kcal: 25, p: 2.5, f: 0.3, c: 5, yield: 0.85, tags: ["veg"] },
  { id: "carrot", name: "Морковь", cat: "Овощи", kcal: 35, p: 1.3, f: 0.1, c: 8, yield: 0.9, tags: ["veg"] },
  { id: "zucchini", name: "Кабачок", cat: "Овощи", kcal: 24, p: 1.5, f: 0.2, c: 4, yield: 0.9, tags: ["veg"] },
  { id: "pepper_bell", name: "Перец болгарский", cat: "Овощи", kcal: 27, p: 1, f: 0.3, c: 6, yield: 0.9, tags: ["veg"] },
  { id: "spinach", name: "Шпинат", cat: "Овощи", kcal: 23, p: 2.9, f: 0.4, c: 3.6, yield: 0.85, tags: ["veg"] },
  { id: "potato", name: "Картофель", cat: "Овощи", kcal: 77, p: 2, f: 0.4, c: 16, yield: 0.92, tags: ["veg"] },
  { id: "cabbage", name: "Капуста белокочанная", cat: "Овощи", kcal: 25, p: 1.3, f: 0.1, c: 5.8, yield: 0.85, tags: ["veg"] },
  { id: "onion", name: "Лук репчатый", cat: "Овощи", kcal: 41, p: 1.4, f: 0.2, c: 9, yield: 0.8, tags: ["veg"] },
  { id: "garlic", name: "Чеснок", cat: "Овощи", kcal: 149, p: 6.4, f: 0.5, c: 33, yield: 1.0, tags: ["veg"] },
  // Фрукты
  { id: "apple", name: "Яблоко", cat: "Фрукты", kcal: 52, p: 0.3, f: 0.2, c: 14, yield: 1.0, tags: ["fruit"] },
  { id: "banana", name: "Банан", cat: "Фрукты", kcal: 89, p: 1.1, f: 0.3, c: 23, yield: 1.0, tags: ["fruit"] },
  { id: "pear", name: "Груша", cat: "Фрукты", kcal: 57, p: 0.4, f: 0.3, c: 15, yield: 1.0, tags: ["fruit"] },
  { id: "orange", name: "Апельсин", cat: "Фрукты", kcal: 47, p: 0.9, f: 0.2, c: 12, yield: 1.0, tags: ["fruit"] },
  { id: "berries", name: "Ягоды", cat: "Фрукты", kcal: 53, p: 1.2, f: 0.7, c: 12, yield: 1.0, tags: ["fruit"] },
  // Орехи и семена
  { id: "almond", name: "Миндаль", cat: "Орехи и семена", kcal: 579, p: 21, f: 50, c: 22, yield: 1.0, tags: ["nut"] },
  { id: "walnut", name: "Грецкий орех", cat: "Орехи и семена", kcal: 654, p: 15, f: 65, c: 14, yield: 1.0, tags: ["nut"] },
  { id: "chia", name: "Семена чиа", cat: "Орехи и семена", kcal: 486, p: 17, f: 31, c: 42, yield: 1.0, tags: ["nut"] },
  { id: "pb", name: "Арахисовая паста", cat: "Орехи и семена", kcal: 588, p: 25, f: 50, c: 20, yield: 1.0, tags: ["legume"] },
  // Масла и жиры
  { id: "olive_oil", name: "Оливковое масло", cat: "Масла и жиры", kcal: 884, p: 0, f: 100, c: 0, yield: 1.0, tags: ["oil"] },
  { id: "butter", name: "Сливочное масло", cat: "Масла и жиры", kcal: 717, p: 0.9, f: 81, c: 0.7, yield: 1.0, tags: ["dairy"] },
  { id: "coconut_oil", name: "Кокосовое масло", cat: "Масла и жиры", kcal: 862, p: 0, f: 100, c: 0, yield: 1.0, tags: ["oil"] },
  // Хлеб и выпечка
  { id: "bread_rye", name: "Хлеб ржаной", cat: "Хлеб и выпечка", kcal: 250, p: 8, f: 3, c: 48, yield: 1.0, tags: ["grain", "gluten"] },
  { id: "bread_ww", name: "Хлеб цельнозерновой", cat: "Хлеб и выпечка", kcal: 260, p: 9, f: 3, c: 50, yield: 1.0, tags: ["grain", "gluten"] },
  // Сладкое
  { id: "honey", name: "Мёд", cat: "Сладкое", kcal: 304, p: 0.3, f: 0, c: 82, yield: 1.0, tags: ["sweet"] },
  { id: "chocolate_dark", name: "Тёмный шоколад", cat: "Сладкое", kcal: 546, p: 5, f: 31, c: 61, yield: 1.0, tags: ["sweet", "dairy"] },
];

export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.cat))];

export function getByCategory(cat) {
  return PRODUCTS.filter((p) => p.cat === cat);
}

// Продукты, разрешённые с учётом ограничений
export function allowedProducts(restrictions) {
  const r = restrictions || {};
  const block = new Set();
  if (r.vegetarian) ["meat", "poultry", "fish", "seafood"].forEach((t) => block.add(t));
  if (r.vegan) ["meat", "poultry", "fish", "seafood", "egg", "dairy"].forEach((t) => block.add(t));
  if (r.glutenFree) block.add("gluten");
  if (r.dairyFree) block.add("dairy");
  const allergies = (r.allergies || []).map((s) => s.trim().toLowerCase());
  const dislikes = (r.dislikes || []).map((s) => s.trim().toLowerCase());
  return PRODUCTS.filter((p) => {
    if (p.tags.some((t) => block.has(t))) return false;
    const name = p.name.toLowerCase();
    if (allergies.some((a) => a && name.includes(a))) return false;
    if (dislikes.some((d) => d && name.includes(d))) return false;
    return true;
  });
}

// Альтернативы в той же категории (для замены и сравнения)
export function alternatives(productId) {
  const p = PRODUCT_MAP[productId];
  if (!p) return [];
  return PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id);
}
