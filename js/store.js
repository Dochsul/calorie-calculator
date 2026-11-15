// Хранилище состояния: localStorage (кэш) + backend (постоянное хранилище)
import { calcCalories, calcMacros, gramsFromPercents } from "./calc.js";
import { api } from "./api.js";

const KEY = "aina_evidence_state_v1";

function uid() {
  return "id" + Math.random().toString(36).slice(2, 9);
}

function defaultDishes() {
  return [
    {
      id: uid(),
      name: "Овсянка с ягодами",
      category: "Завтрак",
      note: "",
      ingredients: [
        { productId: "oats", grams: 60 },
        { productId: "milk_25", grams: 150 },
        { productId: "berries", grams: 100 },
        { productId: "honey", grams: 10 },
      ],
    },
    {
      id: uid(),
      name: "Гречка с курицей",
      category: "Обед",
      note: "",
      ingredients: [
        { productId: "buckwheat", grams: 70 },
        { productId: "chicken_breast", grams: 150 },
        { productId: "broccoli", grams: 120 },
        { productId: "olive_oil", grams: 7 },
      ],
    },
    {
      id: uid(),
      name: "Творог с грушей",
      category: "Перекус",
      note: "",
      ingredients: [
        { productId: "curd_5", grams: 150 },
        { productId: "pear", grams: 120 },
        { productId: "almond", grams: 15 },
      ],
    },
    {
      id: uid(),
      name: "Запечённый лосось с овощами",
      category: "Ужин",
      note: "",
      ingredients: [
        { productId: "salmon", grams: 150 },
        { productId: "zucchini", grams: 150 },
        { productId: "pepper_bell", grams: 100 },
        { productId: "olive_oil", grams: 8 },
      ],
    },
  ];
}

export function defaultState() {
  return {
    client: {
      name: "",
      age: 30,
      weight: 70,
      height: 170,
      gender: "female",
      formula: "mifflin",
      goal: "lose20",
      activity: "1.375",
      isChild: false,
      childAgeGroup: "child4_8",
      pregnancy: false,
      breastfeeding: false,
      cycle: false,
      notes: "",
    },
    regimen: {
      mealsPerDay: 4,
      firstMealTime: "08:00",
      intervalHours: 3,
      days: 1,
    },
    restrictions: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false,
      allergies: "",
      dislikes: "",
    },
    dishes: defaultDishes(),
    menu: { days: [{ meals: Array.from({ length: 4 }, () => ({ dishId: null, servings: 1 })) }] },
    templates: { dishes: [], menus: [] },
    diary: {
      text: "Завтрак яйца жареные на слив масле. Огурец помидор хлеб\n" +
            "Обед макароны с куриной грудкой. Тушить грудку на растит масле с луком. Салат огурец помидор болгарский перец лук\n" +
            "Ужин каша кукурузная с слив маслом и творогом 2% и яйцо вареное\n" +
            "Перекус шоколад молочный. Яблоко",
      meals: [],
      date: "",
      history: [],
    },
    pantry: { productIds: [] },
    // Настройки КБЖУ: режим auto/manual, сохранённые значения
    macroSettings: {
      mode: "auto",        // "auto" — расчёт по анкете, "manual" — ручной ввод
      saved: false,         // сохранённые настройки
      calories: null,      // ручная калорийность (null = auto)
      proteins: null,       // граммы (null = auto)
      fats: null,
      carbs: null,
      proteinPct: 30,       // проценты (для ручного режима по %)
      fatPct: 30,
      carbPct: 40,
      mealsPerDay: null,    // переопределение числа приёмов (null = из режима)
      // Кастомное распределение калорий по приёмам (null = стандартное)
      mealDistribution: null,
    },
  };
}

let state = load();

export function getState() {
  return state;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = defaultState();
      const merged = {
        ...base,
        ...parsed,
        client: { ...base.client, ...(parsed.client || {}) },
        regimen: { ...base.regimen, ...(parsed.regimen || {}) },
        restrictions: { ...base.restrictions, ...(parsed.restrictions || {}) },
        menu: parsed.menu || base.menu,
        templates: { ...base.templates, ...(parsed.templates || {}) },
        diary: { ...base.diary, ...(parsed.diary || {}) },
        pantry: { ...base.pantry, ...(parsed.pantry || {}) },
        macroSettings: { ...base.macroSettings, ...(parsed.macroSettings || {}) },
      };
      // согласовать число приёмов с режимом
      const n = merged.regimen.mealsPerDay;
      merged.menu.days.forEach((d) => {
        while (d.meals.length < n) d.meals.push({ dishId: null, servings: 1 });
        while (d.meals.length > n) d.meals.pop();
      });
      return merged;
    }
  } catch (e) {
    console.warn("aina: не удалось загрузить состояние", e);
  }
  return defaultState();
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("aina: не удалось сохранить состояние", e);
  }
  scheduleBackendSave();
}

// Debounced save to backend — 1.5s after last change
let _saveTimer = null;
function scheduleBackendSave() {
  if (!api.getToken()) return; // не сохраняем без авторизации
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await api.saveState(state);
    } catch (err) {
      console.warn("aina: не удалось сохранить на сервер", err);
    }
  }, 1500);
}

// Загрузить состояние из backend (после входа) и обновить локальный кэш
export async function loadFromBackend() {
  try {
    const data = await api.getState();
    const base = defaultState();
    state = {
      ...base,
      ...data,
      client: { ...base.client, ...(data.client || {}) },
      regimen: { ...base.regimen, ...(data.regimen || {}) },
      restrictions: { ...base.restrictions, ...(data.restrictions || {}) },
      menu: data.menu || base.menu,
      templates: { ...base.templates, ...(data.templates || {}) },
      diary: { ...base.diary, ...(data.diary || {}) },
      pantry: { ...base.pantry, ...(data.pantry || {}) },
      macroSettings: { ...base.macroSettings, ...(data.macroSettings || {}) },
    };
    const n = state.regimen.mealsPerDay;
    state.menu.days.forEach((d) => {
      while (d.meals.length < n) d.meals.push({ dishId: null, servings: 1 });
      while (d.meals.length > n) d.meals.pop();
    });
    localStorage.setItem(KEY, JSON.stringify(state));
    listeners.forEach((fn) => fn());
  } catch (err) {
    console.warn("aina: не удалось загрузить состояние с сервера", err);
  }
}

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notify() {
  persist();
  listeners.forEach((fn) => fn());
}

export function update(mutator) {
  mutator(state);
  notify();
}

export function targetCalories() {
  const ms = state.macroSettings || {};
  if (ms.mode === "manual" && ms.saved && ms.calories) {
    return Math.round(ms.calories);
  }
  return Math.round(calcCalories(state.client));
}

// Текущие макросы (граммы) с учётом режима auto/manual
export function targetMacros() {
  const ms = state.macroSettings || {};
  const cal = targetCalories();
  if (ms.mode === "manual" && ms.saved) {
    if (ms.proteins != null && ms.fats != null && ms.carbs != null) {
      return { proteins: ms.proteins, fats: ms.fats, carbs: ms.carbs };
    }
    // Из процентов
    return gramsFromPercents(cal, ms.proteinPct, ms.fatPct, ms.carbPct);
  }
  return calcMacros(cal);
}

export function newDishId() {
  return uid();
}
