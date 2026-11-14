// Рецепты для генератора меню.
// ingredients: [{ foodId, grams }] — ссылки на FOODS
// tags: dietary tags (vegetarian, vegan, glutenFree, dairyFree, halal, eggFree)

export interface RecipeSeed {
  name: string;
  mealType: string; // breakfast | lunch | dinner | snack
  prepTime: number; // минут
  cookTime: number; // минут
  difficulty: string; // easy | medium | hard
  servings: number;
  ingredients: { foodId: string; grams: number }[];
  steps: string[];
  tags: string[];
}

export const RECIPES: RecipeSeed[] = [
  // ─── Завтраки ───
  {
    name: "Овсянка с ягодами и мёдом",
    mealType: "breakfast", prepTime: 2, cookTime: 8, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "oats", grams: 60 },
      { foodId: "milk_25", grams: 150 },
      { foodId: "berries", grams: 100 },
      { foodId: "honey", grams: 10 },
    ],
    steps: [
      "Залить овсяные хлопья молоком в небольшой кастрюле.",
      "Довести до кипения, варить на медленном огне 5–7 минут, помешивая.",
      "Снять с огня, добавить ягоды и мёд. Перемешать.",
    ],
    tags: ["vegetarian", "dairyFree"],
  },
  {
    name: "Сырники с мёдом",
    mealType: "breakfast", prepTime: 10, cookTime: 10, difficulty: "medium", servings: 1,
    ingredients: [
      { foodId: "curd_5", grams: 150 },
      { foodId: "egg", grams: 25 },
      { foodId: "flour_ww", grams: 20 },
      { foodId: "honey", grams: 10 },
      { foodId: "oil_sunflower", grams: 5 },
    ],
    steps: [
      "Творог размять вилкой, добавить яйцо и муку. Перемешать до однородности.",
      "Сформировать сырники круглой формы.",
      "Обжарить на сковороде с маслом по 3–4 минуты с каждой стороны до золотистой корочки.",
      "Подать с мёдом.",
    ],
    tags: ["vegetarian"],
  },
  {
    name: "Панкейки банановые",
    mealType: "breakfast", prepTime: 5, cookTime: 8, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "oats", grams: 40 },
      { foodId: "egg", grams: 50 },
      { foodId: "milk_25", grams: 50 },
      { foodId: "banana", grams: 60 },
    ],
    steps: [
      "Банан размять вилкой до состояния пюре.",
      "Добавить яйцо, молоко и овсяные хлопья. Перемешать.",
      "Выпекать на сухой сковороде по 2–3 минуты с каждой стороны.",
    ],
    tags: ["vegetarian"],
  },
  {
    name: "Омлет со шпинатом и сыром",
    mealType: "breakfast", prepTime: 5, cookTime: 7, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "egg", grams: 100 },
      { foodId: "milk_25", grams: 30 },
      { foodId: "spinach", grams: 50 },
      { foodId: "cheese_hard", grams: 20 },
      { foodId: "olive_oil", grams: 5 },
    ],
    steps: [
      "Яйца взбить с молоком, посолить.",
      "Разогреть масло на сковороде, добавить шпинат, обжарить 1 минуту.",
      "Вылить яичную смесь, посыпать тёртым сыром.",
      "Накрыть крышкой и готовить 4–5 минут на медленном огне.",
    ],
    tags: ["vegetarian", "glutenFree"],
  },
  {
    name: "Гречка с молоком",
    mealType: "breakfast", prepTime: 2, cookTime: 15, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "buckwheat", grams: 60 },
      { foodId: "milk_25", grams: 200 },
      { foodId: "honey", grams: 8 },
    ],
    steps: [
      "Гречку промыть, залить водой 1:2, варить 15 минут до готовности.",
      "Добавить горячее молоко и мёд. Перемешать.",
    ],
    tags: ["vegetarian"],
  },
  {
    name: "Творог с яблоком и миндалём",
    mealType: "breakfast", prepTime: 3, cookTime: 0, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "curd_5", grams: 150 },
      { foodId: "apple", grams: 120 },
      { foodId: "almond", grams: 15 },
      { foodId: "honey", grams: 8 },
    ],
    steps: [
      "Яблоко нарезать кубиками, миндаль измельчить.",
      "Творог выложить в миску, добавить яблоко, миндаль и мёд. Перемешать.",
    ],
    tags: ["vegetarian", "glutenFree"],
  },
  {
    name: "Греческий йогурт с ягодами и орехами",
    mealType: "breakfast", prepTime: 2, cookTime: 0, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "greek_yogurt", grams: 150 },
      { foodId: "oats", grams: 30 },
      { foodId: "berries", grams: 80 },
      { foodId: "walnut", grams: 15 },
      { foodId: "honey", grams: 8 },
    ],
    steps: [
      "Овсяные хлопья слегка измельчить, орехи порубить.",
      "Выложить слоями: йогурт, хлопья, ягоды, орехи. Полить мёдом.",
    ],
    tags: ["vegetarian"],
  },

  // ─── Обеды ───
  {
    name: "Гречка с курицей и брокколи",
    mealType: "lunch", prepTime: 5, cookTime: 25, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "buckwheat", grams: 70 },
      { foodId: "chicken_breast", grams: 150 },
      { foodId: "broccoli", grams: 120 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Гречку промыть, залить водой 1:2, варить 15 минут.",
      "Куриную грудку нарезать, обжарить на масле 5–7 минут.",
      "Брокколи отварить в кипящей воде 5 минут.",
      "Подать гречку с курицей и брокколи.",
    ],
    tags: ["dairyFree"],
  },
  {
    name: "Куриный суп с овощами",
    mealType: "lunch", prepTime: 10, cookTime: 30, difficulty: "medium", servings: 2,
    ingredients: [
      { foodId: "chicken_breast", grams: 100 },
      { foodId: "potato", grams: 80 },
      { foodId: "carrot", grams: 40 },
      { foodId: "onion", grams: 30 },
      { foodId: "oil_sunflower", grams: 5 },
    ],
    steps: [
      "Курицу залить 500 мл воды, довести до кипения, варить 20 минут.",
      "Добавить нарезанный картофель, варить 10 минут.",
      "Морковь и лук обжарить на масле, добавить в суп.",
      "Варить ещё 5 минут, посолить по вкусу.",
    ],
    tags: ["dairyFree"],
  },
  {
    name: "Борщ с говядиной",
    mealType: "lunch", prepTime: 15, cookTime: 45, difficulty: "medium", servings: 3,
    ingredients: [
      { foodId: "beef_lean", grams: 80 },
      { foodId: "potato", grams: 100 },
      { foodId: "cabbage", grams: 100 },
      { foodId: "carrot", grams: 40 },
      { foodId: "onion", grams: 30 },
      { foodId: "tomato", grams: 80 },
      { foodId: "oil_sunflower", grams: 5 },
    ],
    steps: [
      "Говядину залить 500 мл воды, варить 30 минут.",
      "Добавить нарезанный картофель, варить 10 минут.",
      "Лук и морковь обжарить на масле, добавить помидоры, тушить 5 минут.",
      "Добавить зажарку и капусту в суп, варить 10 минут. Посолить.",
    ],
    tags: ["dairyFree"],
  },
  {
    name: "Макароны с индейкой и томатами",
    mealType: "lunch", prepTime: 5, cookTime: 20, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "pasta_ww", grams: 80 },
      { foodId: "turkey", grams: 120 },
      { foodId: "tomato", grams: 100 },
      { foodId: "onion", grams: 30 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Макароны отварить согласно инструкции на упаковке.",
      "Индейку нарезать, обжарить на масле 7–10 минут.",
      "Добавить нарезанные лук и помидоры, тушить 5 минут.",
      "Соединить с макаронами, перемешать.",
    ],
    tags: ["dairyFree"],
  },
  {
    name: "Овощной суп с чечевицей",
    mealType: "lunch", prepTime: 10, cookTime: 35, difficulty: "easy", servings: 2,
    ingredients: [
      { foodId: "lentil", grams: 30 },
      { foodId: "potato", grams: 100 },
      { foodId: "carrot", grams: 50 },
      { foodId: "onion", grams: 30 },
      { foodId: "cabbage", grams: 80 },
      { foodId: "oil_sunflower", grams: 5 },
    ],
    steps: [
      "Чечевицу промыть, залить 500 мл воды, варить 20 минут.",
      "Добавить нарезанный картофель, варить 10 минут.",
      "Лук и морковь обжарить на масле, добавить в суп.",
      "Добавить капусту, варить ещё 10 минут. Посолить.",
    ],
    tags: ["vegetarian", "vegan", "dairyFree"],
  },
  {
    name: "Рис с курицей и овощами",
    mealType: "lunch", prepTime: 5, cookTime: 25, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "rice_brown", grams: 70 },
      { foodId: "chicken_breast", grams: 130 },
      { foodId: "carrot", grams: 50 },
      { foodId: "onion", grams: 30 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Рис промыть, залить водой 1:2, варить 20 минут до готовности.",
      "Курицу нарезать, обжарить на масле 7 минут.",
      "Добавить нарезанные морковь и лук, тушить 5 минут.",
      "Соединить с рисом, перемешать.",
    ],
    tags: ["dairyFree"],
  },
  {
    name: "Булгур с нутом и овощами",
    mealType: "lunch", prepTime: 10, cookTime: 25, difficulty: "medium", servings: 1,
    ingredients: [
      { foodId: "bulgur", grams: 70 },
      { foodId: "chickpea", grams: 50 },
      { foodId: "tomato", grams: 80 },
      { foodId: "cucumber", grams: 80 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Булгур залить кипятком 1:2, накрыть, настоять 20 минут.",
      "Нут отварить до готовности (или использовать консервированный).",
      "Помидоры и огурцы нарезать, смешать с булгуром и нутом.",
      "Заправить оливковым маслом, посолить.",
    ],
    tags: ["vegetarian", "vegan", "dairyFree"],
  },
  {
    name: "Запечённая курица с картофелем",
    mealType: "lunch", prepTime: 10, cookTime: 40, difficulty: "easy", servings: 2,
    ingredients: [
      { foodId: "chicken_thigh", grams: 150 },
      { foodId: "potato", grams: 200 },
      { foodId: "carrot", grams: 50 },
      { foodId: "olive_oil", grams: 8 },
    ],
    steps: [
      "Картофель и морковь нарезать, выложить на противень.",
      "Куриные бёдра посолить, выложить поверх овощей.",
      "Сбрызнуть маслом, запекать при 200°C 35–40 минут.",
    ],
    tags: ["dairyFree"],
  },

  // ─── Ужины ───
  {
    name: "Запечённый лосось с кабачками",
    mealType: "dinner", prepTime: 5, cookTime: 20, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "salmon", grams: 150 },
      { foodId: "zucchini", grams: 150 },
      { foodId: "pepper_bell", grams: 100 },
      { foodId: "olive_oil", grams: 8 },
    ],
    steps: [
      "Овощи нарезать, выложить на противень, сбрызнуть маслом.",
      "Лосось положить поверх овощей, посолить.",
      "Запекать при 200°C 18–20 минут.",
    ],
    tags: ["dairyFree", "glutenFree"],
  },
  {
    name: "Треска с картофелем и брокколи",
    mealType: "dinner", prepTime: 5, cookTime: 25, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "cod", grams: 150 },
      { foodId: "potato", grams: 150 },
      { foodId: "broccoli", grams: 100 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Картофель отварить 15 минут.",
      "Треску посолить, запекать при 180°C 15 минут.",
      "Брокколи отварить 5 минут.",
      "Подать рыбу с картофелем и брокколи, полить маслом.",
    ],
    tags: ["dairyFree", "glutenFree"],
  },
  {
    name: "Креветки с овощами",
    mealType: "dinner", prepTime: 5, cookTime: 10, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "shrimp", grams: 100 },
      { foodId: "zucchini", grams: 150 },
      { foodId: "pepper_bell", grams: 100 },
      { foodId: "garlic", grams: 5 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Овощи нарезать соломкой, чеснок измельчить.",
      "Обжарить чеснок на масле 1 минуту.",
      "Добавить овощи, жарить 5 минут.",
      "Добавить креветки, готовить 3–4 минуты. Посолить.",
    ],
    tags: ["dairyFree", "glutenFree"],
  },
  {
    name: "Индейка с булгуром",
    mealType: "dinner", prepTime: 5, cookTime: 25, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "turkey", grams: 130 },
      { foodId: "bulgur", grams: 60 },
      { foodId: "carrot", grams: 50 },
      { foodId: "onion", grams: 30 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Булгур залить кипятком 1:2, настоять 20 минут.",
      "Индейку нарезать, обжарить на масле 7 минут.",
      "Добавить морковь и лук, тушить 5 минут.",
      "Соединить с булгуром, перемешать.",
    ],
    tags: ["dairyFree"],
  },
  {
    name: "Кальмар с овощами",
    mealType: "dinner", prepTime: 5, cookTime: 10, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "squid", grams: 150 },
      { foodId: "pepper_bell", grams: 100 },
      { foodId: "onion", grams: 50 },
      { foodId: "garlic", grams: 5 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Кальмар нарезать кольцами, овощи — соломкой.",
      "Обжарить лук и чеснок на масле 2 минуты.",
      "Добавить перец, жарить 3 минуты.",
      "Добавить кальмар, готовить 3–4 минуты. Посолить.",
    ],
    tags: ["dairyFree", "glutenFree"],
  },
  {
    name: "Куриное бедро с киноа",
    mealType: "dinner", prepTime: 5, cookTime: 25, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "chicken_thigh", grams: 130 },
      { foodId: "quinoa", grams: 60 },
      { foodId: "broccoli", grams: 100 },
      { foodId: "olive_oil", grams: 7 },
    ],
    steps: [
      "Киноа промыть, залить водой 1:2, варить 15 минут.",
      "Куриное бедро обжарить на масле 12–15 минут.",
      "Брокколи отварить 5 минут.",
      "Подать курицу с киноа и брокколи.",
    ],
    tags: ["dairyFree", "glutenFree"],
  },
  {
    name: "Творог с зеленью и овощами",
    mealType: "dinner", prepTime: 5, cookTime: 0, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "curd_2", grams: 200 },
      { foodId: "cucumber", grams: 100 },
      { foodId: "tomato", grams: 100 },
      { foodId: "spinach", grams: 30 },
    ],
    steps: [
      "Овощи и шпинат нарезать.",
      "Творог выложить в миску, добавить овощи и шпинат. Перемешать, посолить.",
    ],
    tags: ["vegetarian", "glutenFree"],
  },

  // ─── Перекусы ───
  {
    name: "Творог с грушей и миндалём",
    mealType: "snack", prepTime: 3, cookTime: 0, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "curd_5", grams: 120 },
      { foodId: "pear", grams: 120 },
      { foodId: "almond", grams: 15 },
    ],
    steps: ["Грушу нарезать, миндаль измельчить. Смешать с творогом."],
    tags: ["vegetarian", "glutenFree"],
  },
  {
    name: "Йогурт с ягодами и грецким орехом",
    mealType: "snack", prepTime: 2, cookTime: 0, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "greek_yogurt", grams: 150 },
      { foodId: "berries", grams: 80 },
      { foodId: "walnut", grams: 15 },
    ],
    steps: ["Орехи порубить. Выложить йогурт, сверху ягоды и орехи."],
    tags: ["vegetarian"],
  },
  {
    name: "Яблоко с арахисовой пастой",
    mealType: "snack", prepTime: 2, cookTime: 0, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "apple", grams: 150 },
      { foodId: "pb", grams: 20 },
    ],
    steps: ["Яблоко нарезать дольками, подать с арахисовой пастой."],
    tags: ["vegetarian", "vegan", "dairyFree", "glutenFree"],
  },
  {
    name: "Яйцо варёное с овощами",
    mealType: "snack", prepTime: 2, cookTime: 10, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "egg", grams: 50 },
      { foodId: "cucumber", grams: 100 },
      { foodId: "tomato", grams: 100 },
    ],
    steps: ["Яйцо сварить вкрутую (10 минут). Овощи нарезать, подать с яйцом."],
    tags: ["vegetarian", "glutenFree", "dairyFree"],
  },
  {
    name: "Банан с овсянкой",
    mealType: "snack", prepTime: 2, cookTime: 5, difficulty: "easy", servings: 1,
    ingredients: [
      { foodId: "banana", grams: 120 },
      { foodId: "oats", grams: 30 },
      { foodId: "milk_25", grams: 100 },
    ],
    steps: ["Овсянку залить горячим молоком, настаивать 5 минут. Банан нарезать и добавить."],
    tags: ["vegetarian"],
  },
];
