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
  { id: "client", label: "Анкета", render: renderClient },
  { id: "menu", label: "Меню", render: renderMenu },
  { id: "dishes", label: "Блюда", render: renderDishes },
  { id: "report", label: "Дневник", render: renderReport },
  { id: "templates", label: "Шаблоны", render: renderTemplates },
  { id: "shopping", label: "Покупки", render: renderShopping },
];

let current = "client";
const main = document.getElementById("app");
const nav = document.getElementById("nav");
let navBuilt = false;

function showTab(id) {
  current = id;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  const view = TABS.find((t) => t.id === id);
  if (view) view.render(main);
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
