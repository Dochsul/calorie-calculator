// Точка входа: навигация по вкладкам, первичный рендер и шлюз оплаты (подписка по коду).
import { subscribe } from "./store.js";
import { subscribeAuth, isActive, adminMode } from "./auth.js";
import { renderPaywall } from "./views/paywall.js";
import { renderAdmin } from "./views/admin.js";
import { renderClient } from "./views/client.js";
import { renderMenu } from "./views/menu.js";
import { renderDishes } from "./views/dishes.js";
import { renderTemplates } from "./views/templates.js";
import { renderShopping } from "./views/shopping.js";
import { renderReport } from "./views/report.js";

const TABS = [
  { id: "client", label: "Анкета", desc: "Данные клиента → автоматический расчёт калорий и БЖУ", render: renderClient },
  { id: "menu", label: "Меню", desc: "Составьте меню по дням и приёмам пищи из готовых блюд", render: renderMenu },
  { id: "dishes", label: "Блюда", desc: "Создавайте блюда из продуктов — калории и БЖУ считаются автоматически", render: renderDishes },
  { id: "report", label: "Дневник", desc: "Опишите тарелку текстом → таблица КБЖУ с правкой и удалением", render: renderReport },
  { id: "templates", label: "Шаблоны", desc: "Сохранённые блюда и меню для быстрого повторного применения", render: renderTemplates },
  { id: "shopping", label: "Покупки", desc: "Список покупок по меню, сгруппированный по категориям", render: renderShopping },
];

let current = "client";
const main = document.getElementById("app");
const nav = document.getElementById("nav");
let navBuilt = false;

function showTab(id) {
  current = id;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  const view = TABS.find((t) => t.id === id);
  if (view) {
    const desc = document.getElementById("tab-desc");
    if (desc) desc.textContent = view.desc || "";
    view.render(main);
  }
}

function ensureNav() {
  nav.classList.remove("hidden");
  if (navBuilt) return;
  nav.innerHTML = "";
  TABS.forEach((t) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.dataset.tab = t.id;
    b.textContent = t.label;
    b.onclick = () => showTab(t.id);
    nav.appendChild(b);
  });
  navBuilt = true;

  // Описание активной вкладки
  if (!document.getElementById("tab-desc")) {
    const d = document.createElement("div");
    d.id = "tab-desc";
    d.className = "tab-desc";
    const cur = TABS.find((t) => t.id === current);
    d.textContent = cur ? cur.desc : "";
    nav.parentNode.insertBefore(d, nav.nextSibling);
  }
}

// Шлюз: админка → экран оплаты → приложение (когда подписка активна)
function gate() {
  if (adminMode()) { nav.classList.add("hidden"); renderAdmin(main); return; }
  if (!isActive()) { nav.classList.add("hidden"); renderPaywall(main); return; }
  ensureNav();
  showTab(current);
}

// Перерисовка текущей вкладки при изменении данных — только когда доступ открыт
subscribe(() => {
  if (isActive() && !adminMode()) { ensureNav(); showTab(current); }
});
// Переключение между экраном оплаты, админкой и приложением
subscribeAuth(gate);

gate();
