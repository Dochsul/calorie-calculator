// Рецепты комплексных блюд (суп, панкейки, сырники и т.д.) — предустановленные
// составы, которые парсер распознаёт как единые позиции, а не сумму ингредиентов.
// КБЖУ на 100 г вычисляется автоматически в data.js из ингредиентов рецепта.
//
// Поля:
//   id          — идентификатор продукта (как в PRODUCTS)
//   name        — отображаемое название
//   keys        — подстроки для сопоставления (нижний регистр, без ё)
//   grams       — масса порции по умолчанию (г)
//   water       — добавляемая вода/бульон (мл, 0 ккал) — увеличивает выход блюда
//   ingredients — [{ productId, grams }] — ингредиенты из базы data.js
//   tags        — теги для фильтрации ограничений (vegetarian, dairy и т.д.)
export const COMPOSITE_RECIPES = [
  {
    id: "soup_chicken",
    name: "Куриный суп",
    grams: 300,
    water: 500,
    keys: ["куриный суп", "суп куриный", "суп с куриц", "суп курин", "суп"],
    ingredients: [
      { productId: "chicken_breast", grams: 100 },
      { productId: "potato", grams: 80 },
      { productId: "carrot", grams: 40 },
      { productId: "onion", grams: 30 },
      { productId: "oil_sunflower", grams: 5 },
    ],
    tags: ["soup", "poultry"],
  },
  {
    id: "soup_veg",
    name: "Овощной суп",
    grams: 300,
    water: 500,
    keys: ["овощной суп", "суп овощной", "суп с овощ", "суп овощ"],
    ingredients: [
      { productId: "potato", grams: 100 },
      { productId: "carrot", grams: 50 },
      { productId: "onion", grams: 30 },
      { productId: "cabbage", grams: 80 },
      { productId: "lentil", grams: 30 },
      { productId: "oil_sunflower", grams: 5 },
    ],
    tags: ["soup", "veg"],
  },
  {
    id: "borscht",
    name: "Борщ",
    grams: 350,
    water: 500,
    keys: ["борщ", "свекольник"],
    ingredients: [
      { productId: "beef_lean", grams: 80 },
      { productId: "potato", grams: 100 },
      { productId: "cabbage", grams: 100 },
      { productId: "carrot", grams: 40 },
      { productId: "onion", grams: 30 },
      { productId: "tomato", grams: 80 },
      { productId: "oil_sunflower", grams: 5 },
    ],
    tags: ["soup", "meat"],
  },
  {
    id: "pancakes_banana",
    name: "Панкейки банановые",
    grams: 150,
    water: 0,
    keys: ["панкейки банан", "банановые панкейки", "панкейки с банан"],
    ingredients: [
      { productId: "oats", grams: 40 },
      { productId: "egg", grams: 50 },
      { productId: "milk_25", grams: 50 },
      { productId: "banana", grams: 60 },
    ],
    tags: ["sweet", "grain"],
  },
  {
    id: "pancakes_oat",
    name: "Панкейки овсяные",
    grams: 150,
    water: 0,
    keys: ["панкейки овсян", "овсяные панкейки", "панкейки с овсян", "панкейки"],
    ingredients: [
      { productId: "oats", grams: 50 },
      { productId: "egg", grams: 50 },
      { productId: "milk_25", grams: 50 },
      { productId: "honey", grams: 5 },
    ],
    tags: ["sweet", "grain"],
  },
  {
    id: "syrniki",
    name: "Сырники",
    grams: 200,
    water: 0,
    keys: ["сырники", "творожники"],
    ingredients: [
      { productId: "curd_5", grams: 150 },
      { productId: "egg", grams: 25 },
      { productId: "flour_ww", grams: 20 },
      { productId: "honey", grams: 10 },
    ],
    tags: ["dairy"],
  },
];
