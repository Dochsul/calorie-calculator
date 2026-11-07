/**
 * AINA MENU — Расчётный модуль
 * Все вычисления КБЖУ, выход блюд, порции — выполняются программно
 * на основе подтверждённых продуктов из базы данных.
 */

const ACTIVITY_FACTORS = {
  'min': { label: 'Минимальная (сидячий образ жизни)', value: 1.2 },
  'light': { label: 'Лёгкая (1-3 раза в неделю)', value: 1.375 },
  'moderate': { label: 'Средняя (3-5 раз в неделю)', value: 1.55 },
  'high': { label: 'Высокая (6-7 раз в неделю)', value: 1.725 },
};

const GOALS = {
  'lose': { label: 'Снижение веса', defaultDeficit: 20 },
  'maintain': { label: 'Поддержание веса', defaultDeficit: 0 },
  'gain': { label: 'Набор массы', defaultDeficit: -15 },
  'waist': { label: 'Снижение окружности талии', defaultDeficit: 20 },
  'fat': { label: 'Уменьшение жировой массы', defaultDeficit: 20 },
};

const Calc = {
  // ── BMR: Mifflin-St Jeor ──
  bmrMifflin(gender, weight, height, age) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return gender === 'male' ? base + 5 : base - 161;
  },

  // ── BMR: Harris-Benedict (пересмотрённая версия Roza-Shizgal 1984) ──
  bmrHarrisBenedict(gender, weight, height, age) {
    if (gender === 'male')
      return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    return 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
  },

  // ── TDEE ──
  tdee(bmr, activityKey) {
    const f = ACTIVITY_FACTORS[activityKey] || ACTIVITY_FACTORS.light;
    return bmr * f.value;
  },

  // ── Целевые калории ──
  targetCalories(tdee, goal, deficitPct = 20, customKcal = null) {
    if (customKcal !== null) return customKcal;
    if (goal === 'maintain') return tdee;
    if (goal === 'gain') return tdee * (1 + (deficitPct || 15) / 100);
    // lose / waist / fat
    return tdee * (1 - deficitPct / 100);
  },

  // ── БЖУ в процентах (базовый 30/30/40) ──
  macrosByPercent(calories, pPct = 30, fPct = 30, cPct = 40) {
    // Проверка согласованности
    const sum = pPct + fPct + cPct;
    if (Math.abs(sum - 100) > 1) {
      return { protein: 0, fat: 0, carbs: 0, warning: 'Сумма процентов БЖУ не равна 100% (' + sum + '%)' };
    }
    return {
      protein: Math.round((calories * pPct / 100) / 4),
      fat: Math.round((calories * fPct / 100) / 9),
      carbs: Math.round((calories * cPct / 100) / 4),
      pPct, fPct, cPct
    };
  },

  // ── БЖУ на г/кг массы ──
  macrosByKg(calories, weight, proteinPerKg = 1.6, fatPerKg = 1.0, cPct = null) {
    const protein = Math.round(weight * proteinPerKg);
    const fat = Math.round(weight * fatPerKg);
    const proteinKcal = protein * 4;
    const fatKcal = fat * 9;
    const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
    const carbs = Math.round(carbsKcal / 4);
    return { protein, fat, carbs, proteinPerKg, fatPerKg };
  },

  // ── Проверка согласованности ──
  checkConsistency(calories, protein, fat, carbs) {
    const calc = protein * 4 + fat * 9 + carbs * 4;
    const diff = Math.abs(calc - calories);
    return { calc, diff, pct: Math.round(diff / calories * 100), ok: diff < calories * 0.05 };
  },

  // ── ИМТ ──
  bmi(weight, heightCm) {
    const h = heightCm / 100;
    const v = weight / (h * h);
    let cat = '';
    if (v < 18.5) cat = 'Недостаточный вес';
    else if (v < 25) cat = 'Норма';
    else if (v < 30) cat = 'Избыточный вес';
    else cat = 'Ожирение';
    return { value: Math.round(v * 10) / 10, category: cat };
  },

  // ── Соотношение талии/роста ──
  whtr(waist, heightCm) {
    if (!waist || !heightCm) return null;
    const v = waist / heightCm;
    let cat = '';
    if (v < 0.43) cat = 'Норма';
    else if (v < 0.53) cat = 'Повышенный риск';
    else cat = 'Высокий риск';
    return { value: Math.round(v * 100) / 100, category: cat };
  },

  // ── Вес одного ингредиента после приготовления ──
  cookedWeight(rawGrams, product) {
    if (!product) return rawGrams;
    if (product.yt === 'expand') return rawGrams * product.yield;
    if (product.yt === 'shrink') return rawGrams * product.yield;
    return rawGrams; // none
  },

  // ── Питательная ценность ингредиента (из сырых/сухих данных) ──
  ingredientNutrition(grams, product) {
    if (!product) return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, cookedWeight: 0 };
    const f = grams / 100;
    return {
      kcal: Math.round(product.kcal * f),
      protein: Math.round(product.protein * f * 10) / 10,
      fat: Math.round(product.fat * f * 10) / 10,
      carbs: Math.round(product.carbs * f * 10) / 10,
      fiber: Math.round(product.fiber * f * 10) / 10,
      cookedWeight: Math.round(this.cookedWeight(grams, product))
    };
  },

  // ── Общий расчёт блюда ──
  recipeTotal(ingredients) {
    // ingredients: [{ product: productObj, grams, method }]
    let total = { rawWeight: 0, cookedWeight: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
    const details = ingredients.map(ing => {
      const n = this.ingredientNutrition(ing.grams, ing.product);
      total.rawWeight += ing.grams;
      total.cookedWeight += n.cookedWeight;
      total.kcal += n.kcal;
      total.protein += n.protein;
      total.fat += n.fat;
      total.carbs += n.carbs;
      total.fiber += n.fiber;
      return {
        product: ing.product,
        grams: ing.grams,
        method: ing.method || '',
        cookedGrams: n.cookedWeight,
        kcal: n.kcal,
        protein: n.protein,
        fat: n.fat,
        carbs: n.carbs,
        fiber: n.fiber
      };
    });
    // Округление итогов
    total.kcal = Math.round(total.kcal);
    total.protein = Math.round(total.protein * 10) / 10;
    total.fat = Math.round(total.fat * 10) / 10;
    total.carbs = Math.round(total.carbs * 10) / 10;
    total.fiber = Math.round(total.fiber * 10) / 10;
    total.cookedWeight = Math.round(total.cookedWeight);
    return { total, details };
  },

  // ── Порция: КБЖУ из доли готового блюда ──
  portionNutrition(recipeTotal, portionGrams) {
    if (!recipeTotal.cookedWeight || recipeTotal.cookedWeight <= 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, fraction: 0, remaining: 0 };
    const fraction = portionGrams / recipeTotal.cookedWeight;
    return {
      kcal: Math.round(recipeTotal.kcal * fraction),
      protein: Math.round(recipeTotal.protein * fraction * 10) / 10,
      fat: Math.round(recipeTotal.fat * fraction * 10) / 10,
      carbs: Math.round(recipeTotal.carbs * fraction * 10) / 10,
      fiber: Math.round(recipeTotal.fiber * fraction * 10) / 10,
      fraction: Math.round(fraction * 1000) / 1000,
      remaining: Math.round(recipeTotal.cookedWeight - portionGrams)
    };
  },

  // ── Пересчёт с фактическим готовым весом ──
  recalcWithActualWeight(ingredients, actualCookedWeight) {
    const calc = this.recipeTotal(ingredients);
    // Если задан фактический вес — пересчитываем КБЖУ на 100 г готового
    const ratio = actualCookedWeight / calc.total.cookedWeight;
    const per100 = {
      kcal: Math.round(calc.total.kcal / actualCookedWeight * 100),
      protein: Math.round(calc.total.protein / actualCookedWeight * 100 * 10) / 10,
      fat: Math.round(calc.total.fat / actualCookedWeight * 100 * 10) / 10,
      carbs: Math.round(calc.total.carbs / actualCookedWeight * 100 * 10) / 10,
    };
    return { ...calc, actualCookedWeight, per100 };
  },

  // ── Распознавание текста: поиск продуктов ──
  parseMealText(text) {
    // Разбиваем по запятым, "и", "с", "+" и очищаем
    const parts = text.toLowerCase()
      .replace(/[,+]/g, ' ')
      .replace(/\s+и\s/g, ' ')
      .replace(/\s+с\s/g, ' ')
      .split(/\s+/);
    
    const found = [];
    const usedIds = new Set();

    // Сначала пытаемся найти многословные совпадения
    const words = text.toLowerCase().replace(/[,+]/g, ' ').split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      // Проверяем 2-словные и 3-словные комбинации
      for (let len = Math.min(3, words.length - i); len >= 1; len--) {
        const phrase = words.slice(i, i + len).join(' ').trim();
        // Очищаем от предлогов
        if (['и', 'с', 'на', 'в', 'для', 'из', 'от', 'до', 'не'].includes(phrase)) continue;
        
        // Прямой поиск по алиасам
        if (PRODUCT_ALIASES[phrase]) {
          const id = PRODUCT_ALIASES[phrase];
          if (!usedIds.has(id)) {
            found.push(getProduct(id));
            usedIds.add(id);
            i += len - 1; // пропускаем использованные слова
            break;
          }
        }
        // Поиск по названию продукта
        const match = PRODUCTS.find(p => p.name.toLowerCase().includes(phrase) && !usedIds.has(p.id) && phrase.length > 2);
        if (match) {
          found.push(match);
          usedIds.add(match.id);
          i += len - 1;
          break;
        }
      }
    }

    return found;
  },

  // ── Предложение граммовок по типу продукта ──
  suggestGrams(product) {
    if (!product) return 100;
    return DEFAULT_PORTION_GRAMS[product.cat] || 100;
  },

  // ── Оптимизация порций под целевые КБЖУ ──
  // Простая пропорциональная шкалировка: масштабируем все граммовки
  // так, чтобы сумма калорий приблизилась к цели.
  optimizePortions(meals, targetCalories) {
    // meals: [{ ingredients: [{product, grams}], targetFraction }]
    // Считаем текущую сумму калорий
    let currentKcal = 0;
    for (const meal of meals) {
      if (!meal.ingredients) continue;
      const rt = this.recipeTotal(meal.ingredients);
      // Порция = всё блюдо (1 порция), или заданная доля
      currentKcal += rt.total.kcal * (meal.portionFraction || 1);
    }

    if (currentKcal <= 0) return meals;
    
    // Коэффициент шкалирования
    let scale = targetCalories / currentKcal;
    // Ограничиваем: не более ±50%
    scale = Math.max(0.5, Math.min(1.5, scale));

    // Применяем масштабирование к граммовкам
    for (const meal of meals) {
      if (!meal.ingredients) continue;
      for (const ing of meal.ingredients) {
        ing.grams = Math.round(ing.grams * scale / 5) * 5; // округление до 5 г
        // Ограничение реалистичных порций
        ing.grams = Math.max(5, Math.min(1000, ing.grams));
      }
    }
    return meals;
  },

  // ── Сумма по дню ──
  dayTotal(mealResults) {
    const total = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, weight: 0 };
    for (const r of mealResults) {
      if (!r.portion) continue;
      total.kcal += r.portion.kcal;
      total.protein += r.portion.protein;
      total.fat += r.portion.fat;
      total.carbs += r.portion.carbs;
      total.fiber += r.portion.fiber;
      total.weight += r.portionWeight || 0;
    }
    total.kcal = Math.round(total.kcal);
    total.protein = Math.round(total.protein * 10) / 10;
    total.fat = Math.round(total.fat * 10) / 10;
    total.carbs = Math.round(total.carbs * 10) / 10;
    total.fiber = Math.round(total.fiber * 10) / 10;
    total.weight = Math.round(total.weight);
    return total;
  },
};
