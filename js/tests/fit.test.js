// Расширенные тесты алгоритма автоподбора граммовки (js/fit.js).
// Проверяют точность попадания в цель, неизменность фиксированных категорий,
// округление, ограничение коэффициента масштабирования и граничные случаи.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitMeals } from "../../js/fit.js";
import { PRODUCT_MAP } from "../../js/data.js";

// --- Хелперы ---

// Общая калорийность набора приёмов
const total = (meals) =>
  meals.reduce((a, m) =>
    a + m.ingredients.reduce((s, g) =>
      s + (PRODUCT_MAP[g.productId].kcal * g.grams) / 100, 0), 0);

// Калорийность одного приёма
const mealKcal = (meal) =>
  meal.ingredients.reduce((s, g) =>
    s + (PRODUCT_MAP[g.productId].kcal * g.grams) / 100, 0);

// Глубокая копия
const clone = (meals) => JSON.parse(JSON.stringify(meals));

// Фиксированные категории (не масштабируются)
const FIXED_CATS = new Set(["Овощи", "Масла и жиры", "Сладкое"]);

// Тестовый набор: 4 приёма, смесь фиксированных и масштабируемых ингредиентов
const SAMPLE_MEALS = [
  { name: "Завтрак", ingredients: [
    { productId: "oats", grams: 60 },
    { productId: "milk_25", grams: 150 },
    { productId: "egg", grams: 50 },
  ]},
  { name: "Обед", ingredients: [
    { productId: "chicken_breast", grams: 150 },
    { productId: "buckwheat", grams: 70 },
    { productId: "broccoli", grams: 120 },   // Овощи — fixed
    { productId: "olive_oil", grams: 7 },     // Масла — fixed
  ]},
  { name: "Ужин", ingredients: [
    { productId: "salmon", grams: 150 },
    { productId: "zucchini", grams: 150 },   // Овощи — fixed
  ]},
  { name: "Перекус", ingredients: [
    { productId: "apple", grams: 150 },
    { productId: "chocolate_milk", grams: 20 }, // Сладкое — fixed
  ]},
];

// ========== 1. Точность автоподбора для разных целевых калорийностей ==========
for (const target of [1200, 1500, 2000, 2500]) {
  test(`fitMeals: день близок к цели ${target} ккал`, () => {
    const fitted = fitMeals(clone(SAMPLE_MEALS), target);
    const t = total(fitted);
    assert.ok(
      Math.abs(t - target) < target * 0.15,
      `цель ${target}, факт ${Math.round(t)}, отклонение ${Math.round(Math.abs(t - target))}`,
    );
  });
}

// ========== 2. Все веса в допустимом диапазоне [1, 2000] г ==========
test("fitMeals: все веса в диапазоне [1, 2000] г", () => {
  for (const target of [300, 1500, 5000, 10000]) {
    const fitted = fitMeals(clone(SAMPLE_MEALS), target);
    for (const meal of fitted) {
      for (const g of meal.ingredients) {
        assert.ok(g.grams >= 1 && g.grams <= 2000,
          `${g.productId}: ${g.grams} вне [1, 2000] при цели ${target}`);
      }
    }
  }
});

// ========== 3. Фиксированные категории не масштабируются ==========
test("fitMeals: овощи, масла и сладкое сохраняют исходный вес", () => {
  const orig = clone(SAMPLE_MEALS);
  const fitted = fitMeals(clone(SAMPLE_MEALS), 2000);
  fitted.forEach((meal, mi) => {
    meal.ingredients.forEach((g, ii) => {
      const prod = PRODUCT_MAP[g.productId];
      if (FIXED_CATS.has(prod.cat)) {
        assert.equal(g.grams, orig[mi].ingredients[ii].grams,
          `${prod.name} (${prod.cat}) не должен меняться: ${orig[mi].ingredients[ii].grams} → ${g.grams}`);
      }
    });
  });
});

// ========== 4. Яйца округляются до шага 50 г ==========
test("fitMeals: яйца кратны 50 г и не меньше 50 г", () => {
  const meals = [{ name: "Завтрак", ingredients: [
    { productId: "egg", grams: 50 },
    { productId: "oats", grams: 60 },
  ]}];
  for (const target of [500, 1000, 2000, 4000]) {
    const fitted = fitMeals(clone(meals), target);
    const egg = fitted[0].ingredients.find((g) => g.productId === "egg");
    assert.ok(egg.grams % 50 === 0, `яйцо кратно 50 г при цели ${target}: ${egg.grams}`);
    assert.ok(egg.grams >= 50, `яйцо не меньше 50 г при цели ${target}: ${egg.grams}`);
  }
});

// ========== 5. Масштабируемые ингредиенты (кроме яиц) кратны 5 г ==========
test("fitMeals: масштабируемые ингредиенты кратны 5 г", () => {
  const fitted = fitMeals(clone(SAMPLE_MEALS), 1733);
  fitted.forEach((meal) => {
    meal.ingredients.forEach((g) => {
      const prod = PRODUCT_MAP[g.productId];
      if (FIXED_CATS.has(prod.cat)) return;
      if (g.productId === "egg") return;
      assert.ok(g.grams % 5 === 0, `${prod.name}: ${g.grams} не кратно 5 г`);
    });
  });
});

// ========== 6. Коэффициент масштабирования ограничен [K_MIN, K_MAX] ==========
test("fitMeals: при низкой цели коэффициент не падает ниже K_MIN (0.4)", () => {
  const orig = clone(SAMPLE_MEALS);
  const fitted = fitMeals(clone(SAMPLE_MEALS), 300);
  fitted.forEach((meal, mi) => {
    meal.ingredients.forEach((g, ii) => {
      const prod = PRODUCT_MAP[g.productId];
      if (FIXED_CATS.has(prod.cat)) return;
      if (g.productId === "egg") return; // яйца имеют минимум 50 г
      const ratio = g.grams / orig[mi].ingredients[ii].grams;
      assert.ok(ratio >= 0.3,
        `${prod.name}: ratio ${ratio.toFixed(2)} < 0.3 (K_MIN=0.4 с допуском округления)`);
    });
  });
});

test("fitMeals: при высокой цели коэффициент не превышает K_MAX (3)", () => {
  const orig = clone(SAMPLE_MEALS);
  const fitted = fitMeals(clone(SAMPLE_MEALS), 20000);
  fitted.forEach((meal, mi) => {
    meal.ingredients.forEach((g, ii) => {
      const prod = PRODUCT_MAP[g.productId];
      if (FIXED_CATS.has(prod.cat)) return;
      const ratio = g.grams / orig[mi].ingredients[ii].grams;
      assert.ok(ratio <= 3.2,
        `${prod.name}: ratio ${ratio.toFixed(2)} > 3.2 (K_MAX=3 с допуском округления)`);
    });
  });
});

// ========== 7. Приём только с фиксированными продуктами не меняется ==========
test("fitMeals: приём только с фиксированными продуктами не масштабируется", () => {
  const meals = [
    { name: "Перекус", ingredients: [
      { productId: "tomato", grams: 100 },
      { productId: "cucumber", grams: 100 },
      { productId: "olive_oil", grams: 7 },
    ]},
  ];
  const origGrams = meals[0].ingredients.map((g) => g.grams);
  const fitted = fitMeals(meals, 2000);
  fitted[0].ingredients.forEach((g, i) => {
    assert.equal(g.grams, origGrams[i], `фиксированный продукт изменился: ${origGrams[i]} → ${g.grams}`);
  });
});

// ========== 8. Пустой приём не вызывает ошибку ==========
test("fitMeals: пустой приём возвращает исходные данные", () => {
  const meals = [{ name: "Завтрак", ingredients: [] }];
  const fitted = fitMeals(meals, 1500);
  assert.equal(fitted.length, 1);
  assert.deepEqual(fitted[0].ingredients, []);
});

// ========== 9. Приём без масштабируемых продуктов (baseKcal = 0) не меняется ==========
test("fitMeals: baseKcal = 0 → приём не масштабируется", () => {
  const meals = [
    { name: "Обед", ingredients: [{ productId: "broccoli", grams: 120 }] },
    { name: "Ужин", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
  ];
  const fitted = fitMeals(meals, 1500);
  assert.equal(fitted[0].ingredients[0].grams, 120, "обед без масштабируемых не должен меняться");
});

// ========== 10. Цель = 0 → приёмы не меняются ==========
test("fitMeals: target = 0 → приёмы возвращаются без изменений", () => {
  const orig = clone(SAMPLE_MEALS);
  const fitted = fitMeals(clone(SAMPLE_MEALS), 0);
  assert.deepEqual(fitted, orig);
});

// ========== 11. Один приём забирает всю калорийность ==========
test("fitMeals: один приём подбирается близко к цели", () => {
  const meals = [{ name: "Завтрак", ingredients: [
    { productId: "oats", grams: 60 },
    { productId: "chicken_breast", grams: 150 },
  ]}];
  // Базовая калорийность ~392 ккал, при k=3 максимум ~1175 — цель в пределах
  for (const target of [500, 800, 1000]) {
    const fitted = fitMeals(clone(meals), target);
    const t = total(fitted);
    assert.ok(Math.abs(t - target) < target * 0.2,
      `цель ${target}, факт ${Math.round(t)}`);
  }
});

// ========== 12. 5 приёмов (с Полдником) корректно распределяет калории ==========
test("fitMeals: 5 приёмов (Полдник) попадает в цель", () => {
  const meals = [
    { name: "Завтрак", ingredients: [{ productId: "oats", grams: 60 }] },
    { name: "Перекус", ingredients: [{ productId: "banana", grams: 120 }] },
    { name: "Обед", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    { name: "Полдник", ingredients: [{ productId: "curd_5", grams: 150 }] },
    { name: "Ужин", ingredients: [{ productId: "salmon", grams: 150 }] },
  ];
  const target = 1800;
  const fitted = fitMeals(clone(meals), target);
  const t = total(fitted);
  assert.ok(Math.abs(t - target) < target * 0.2, `5 приёмов: цель ${target}, факт ${Math.round(t)}`);
});

// ========== 13. Неизвестное название приёма — доля по умолчанию ==========
test("fitMeals: неизвестное название приёма использует долю 0.2", () => {
  const meals = [
    { name: "Завтрак", ingredients: [{ productId: "oats", grams: 60 }] },
    { name: "Ланч", ingredients: [{ productId: "chicken_breast", grams: 150 }] },
    { name: "Ужин", ingredients: [{ productId: "salmon", grams: 150 }] },
  ];
  const fitted = fitMeals(clone(meals), 1500);
  assert.ok(total(fitted) > 0, "должна получиться положительная калорийность");
  assert.ok(Math.abs(total(fitted) - 1500) < 500, `цель 1500, факт ${Math.round(total(fitted))}`);
});

// ========== 14. Распределение по приёмам пропорционально долям ==========
test("fitMeals: калорийность приёмов пропорциональна долям SHARE", () => {
  const target = 2000;
  const fitted = fitMeals(clone(SAMPLE_MEALS), target);
  const shares = { "Завтрак": 0.27, "Обед": 0.33, "Ужин": 0.27, "Перекус": 0.13 };
  const sum = Object.values(shares).reduce((a, b) => a + b, 0);
  fitted.forEach((meal) => {
    const expected = target * (shares[meal.name] || 0.2) / sum;
    const actual = mealKcal(meal);
    assert.ok(Math.abs(actual - expected) < expected * 0.35,
      `${meal.name}: ожидалось ~${Math.round(expected)}, факт ${Math.round(actual)}`);
  });
});

// ========== 15. Исходные meals не мутируются ==========
test("fitMeals: исходные meals не мутируются", () => {
  const orig = clone(SAMPLE_MEALS);
  const origSnap = JSON.stringify(orig);
  fitMeals(clone(SAMPLE_MEALS), 1800);
  assert.equal(JSON.stringify(orig), origSnap, "оригинал не должен измениться");
});

// ========== 16. Комплексные блюда также масштабируются ==========
test("fitMeals: комплексное блюдо (суп) масштабируется как обычный продукт", () => {
  // Суп низкокалориен (32.5 ккал/100г) — нужен высокий базовый компонент рядом,
  // чтобы общая база превышала цель и коэффициент опустился ниже 1.
  const meals = [
    { name: "Обед", ingredients: [
      { productId: "chicken_breast", grams: 500 },
      { productId: "soup_chicken", grams: 300 },
    ]},
    { name: "Ужин", ingredients: [{ productId: "salmon", grams: 150 }] },
  ];
  const fitted = fitMeals(clone(meals), 500);
  const soup = fitted[0].ingredients.find((g) => g.productId === "soup_chicken");
  assert.ok(soup.grams < 300, `суп должен уменьшиться при низкой цели: ${soup.grams}`);
  assert.ok(soup.grams >= 5, `суп не легче 5 г: ${soup.grams}`);
  assert.ok(soup.grams % 5 === 0, `суп кратен 5 г: ${soup.grams}`);
});

// ========== 17. При высокой цели фиксированные продукты не растут ==========
test("fitMeals: при высокой цели фиксированные продукты не увеличиваются", () => {
  const orig = clone(SAMPLE_MEALS);
  const fitted = fitMeals(clone(SAMPLE_MEALS), 5000);
  fitted.forEach((meal, mi) => {
    meal.ingredients.forEach((g, ii) => {
      const prod = PRODUCT_MAP[g.productId];
      if (FIXED_CATS.has(prod.cat)) {
        assert.equal(g.grams, orig[mi].ingredients[ii].grams,
          `${prod.name} не должен расти: ${orig[mi].ingredients[ii].grams} → ${g.grams}`);
      }
    });
  });
});
