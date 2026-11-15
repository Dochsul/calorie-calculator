// Автогенерация разнообразного меню из продуктов, которые есть дома.
// Алгоритм: для каждого дня и приёма пищи выбираем продукты из pantry,
// распределённые по категориям (белок, злак, овощ, фрукт, молочное, жир),
// с ротацией для разнообразия. Граммовка подбирается через fitMeals.

import { PRODUCT_MAP, PRODUCTS } from "./data.js";
import { mealPlan, mealTimes } from "./calc.js";
import { fitMeals } from "./fit.js";

// Категории продуктов по ролям в блюде
const PROTEINS = PRODUCTS.filter((p) =>
  ["Мясо", "Птица", "Рыба", "Морепродукты", "Яйца"].includes(p.cat)
).map((p) => p.id);
const GRAINS = PRODUCTS.filter((p) =>
  ["Злаки и крупы", "Макаронные изделия"].includes(p.cat)
).map((p) => p.id);
const DAIRY = PRODUCTS.filter((p) => p.cat === "Молочные").map((p) => p.id);
const VEGGIES = PRODUCTS.filter((p) => p.cat === "Овощи").map((p) => p.id);
const FRUITS = PRODUCTS.filter((p) => p.cat === "Фрукты").map((p) => p.id);
const FATS = PRODUCTS.filter((p) => p.cat === "Масла и жиры").map((p) => p.id);
const LEGUMES = PRODUCTS.filter((p) => p.cat === "Бобовые").map((p) => p.id);

// Шаблоны приёмов пищи: какие роли продуктов нужны
const MEAL_TEMPLATES = {
  Завтрак: ["grain", "dairy", "fruit"],
  Обед: ["protein", "grain", "veg", "fat"],
  Перекус: ["dairy", "fruit", "nut"],
  Полдник: ["dairy", "fruit"],
  Ужин: ["protein", "veg", "fat"],
};

const ROLE_POOLS = {
  protein: PROTEINS,
  grain: GRAINS,
  dairy: DAIRY,
  veg: VEGGIES,
  fruit: FRUITS,
  fat: FATS,
  nut: [...PRODUCTS.filter((p) => p.cat === "Орехи и семена").map((p) => p.id), ...LEGUMES],
};

// Дефолтные граммовки по ролям
const DEFAULT_GRAMS = {
  protein: 150,
  grain: 70,
  dairy: 150,
  veg: 120,
  fruit: 120,
  fat: 7,
  nut: 15,
};

// Перемешать массив (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Выбрать продукт из роли, учитывая pantry и предыдущие выборы
function pickProduct(role, pantrySet, usedToday, usedYesterday) {
  const pool = (ROLE_POOLS[role] || []).filter((id) => pantrySet.has(id));
  if (!pool.length) return null;
  // Избегаем повторов в течение дня
  const todayFree = pool.filter((id) => !usedToday.has(id));
  if (todayFree.length) return shuffle(todayFree)[0];
  // Избегаем вчерашних
  const fresh = pool.filter((id) => !usedYesterday.has(id));
  if (fresh.length) return shuffle(fresh)[0];
  return shuffle(pool)[0];
}

export function generateMenu(pantryIds, regimen, targetKcal) {
  const pantrySet = new Set(pantryIds || []);
  if (pantrySet.size < 3) return null;

  const days = regimen.days || 1;
  const mealsPerDay = regimen.mealsPerDay || 4;
  const plan = mealPlan(mealsPerDay, targetKcal);
  const times = mealTimes(regimen.firstMealTime, mealsPerDay, regimen.intervalHours);

  const menuDays = [];
  let usedYesterday = new Set();

  for (let d = 0; d < days; d++) {
    const usedToday = new Set();
    const meals = [];

    for (let mi = 0; mi < mealsPerDay; mi++) {
      const mealName = plan[mi]?.name || "Перекус";
      const roles = MEAL_TEMPLATES[mealName] || ["protein", "veg", "fat"];
      const ingredients = [];

      for (const role of roles) {
        const pid = pickProduct(role, pantrySet, usedToday, usedYesterday);
        if (!pid) continue;
        usedToday.add(pid);
        ingredients.push({
          productId: pid,
          grams: DEFAULT_GRAMS[role] || 100,
        });
      }

      if (ingredients.length === 0) continue;
      meals.push({ name: mealName, ingredients, time: times[mi] });
    }

    // Подобрать граммовку под калорийность
    const fitted = fitMeals(meals, targetKcal);

    menuDays.push({
      meals: fitted.map((m) => ({
        dishId: null,
        servings: 1,
        _generated: { name: m.name, ingredients: m.ingredients, time: m.time },
      })),
    });
    usedYesterday = new Set(usedToday);
  }

  return { days: menuDays };
}

// Создать блюда из сгенерированного меню и вернуть готовую структуру
// для сохранения в store (dishes + menu.days)
export function buildGeneratedMenu(pantryIds, regimen, targetKcal, dishIdFn) {
  const generated = generateMenu(pantryIds, regimen, targetKcal);
  if (!generated) return null;

  const newDishes = [];
  const days = generated.days.map((day) => ({
    meals: day.meals.map((meal) => {
      const g = meal._generated;
      const id = dishIdFn();
      newDishes.push({
        id,
        name: nameForDish(g.ingredients),
        category: g.name,
        note: "Сгенерировано автоматически",
        ingredients: g.ingredients,
      });
      return { dishId: id, servings: 1 };
    }),
  }));

  return { dishes: newDishes, days };
}

// Название блюда по ингредиентам
function nameForDish(ingredients) {
  if (!ingredients || !ingredients.length) return "Блюдо";
  const names = ingredients.map((ing) => {
    const p = PRODUCT_MAP[ing.productId];
    return p ? p.name : "";
  }).filter(Boolean);
  if (names.length <= 2) return names.join(" с ");
  return names[0] + " с " + names.slice(1, 3).join(" и ");
}
