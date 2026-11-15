// Конфигурация монетизации Aina Évidence.
// Тарифы в евро. Цены редактируются в админ-панели и хранятся в БД.

export const PLANS = [
  { id: "monthly", interval: "month", label: "1 месяц", price: "12.90", perMonth: "12,90 €/мес", save: null },
  { id: "quarterly", interval: "3-month", label: "3 месяца", price: "34.90", perMonth: "11,63 €/мес", save: "выгода 3,80 €" },
  { id: "yearly", interval: "year", label: "12 месяцев", price: "119.90", perMonth: "9,99 €/мес", save: "выгода 34,90 €" },
];

// Бесплатные функции (доступны без подписки)
export const FREE_FEATURES = {
  questionnaire: true,    // Заполнение анкеты и расчёт КБЖУ
  viewResults: true,      // Просмотр результатов расчёта
  pantry: false,          // Управление продуктами — платная
  menu: false,            // Генерация меню — платная
  dishes: false,          // Создание блюд — платная
  shopping: false,        // Список покупок — платная
  report: false,          // Дневник питания — платная
  templates: false,       // Шаблоны — платная
};

// Разовый вступительный платёж (отключён по умолчанию)
export const INIT_FEE = {
  enabled: false,
  amount: "29.90",
  label: "Разовый вступительный взнос",
};

// URL для Stripe Checkout (публичный ключ)
export const STRIPE_PUBLIC_KEY = "";

export default { PLANS, FREE_FEATURES, INIT_FEE };
