// Точка входа: навигация по вкладкам, первичный рендер и шлюз авторизации.
import { subscribe } from "./store.js";
import { subscribeAuth, isAuthenticated, isAdmin, logout } from "./auth.js";
import { renderAuth } from "./views/auth.js";
import { renderClient } from "./views/client.js";
import { renderKbzhu } from "./views/kbzhu.js";
import { renderPantry } from "./views/pantry.js";
import { renderMenu } from "./views/menu.js";
import { renderDishes } from "./views/dishes.js";
import { renderTemplates } from "./views/templates.js";
import { renderShopping } from "./views/shopping.js";
import { renderReport } from "./views/report.js";
import { renderPaywall } from "./views/paywall.js";
import { renderAdmin } from "./views/admin.js";

const TABS = [
  { id: "client", label: "Анкета", render: renderClient },
  { id: "kbzhu", label: "Мой КБЖУ", render: renderKbzhu },
  { id: "pantry", label: "Продукты дома", render: renderPantry },
  { id: "menu", label: "Меню", render: renderMenu },
  { id: "dishes", label: "Блюда", render: renderDishes },
  { id: "report", label: "Дневник", render: renderReport },
  { id: "templates", label: "Шаблоны", render: renderTemplates },
  { id: "shopping", label: "Покупки", render: renderShopping },
  { id: "paywall", label: "Подписка", render: renderPaywall },
  { id: "admin", label: "Админ", render: renderAdmin, adminOnly: true },
];

let current = "client";
const main = document.getElementById("app");
const nav = document.getElementById("nav");
let navBuilt = false;

function getVisibleTabs() {
  return TABS.filter((t) => !t.adminOnly || isAdmin());
}

function showTab(id) {
  current = id;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  const view = TABS.find((t) => t.id === id);
  if (view) view.render(main);
}

function ensureNav() {
  nav.classList.remove("hidden");
  nav.innerHTML = "";
  getVisibleTabs().forEach((t) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.dataset.tab = t.id;
    b.textContent = t.label;
    b.onclick = () => showTab(t.id);
    nav.appendChild(b);
  });
  navBuilt = true;
}

// Шлюз: не авторизован → экран входа; авторизован → приложение
function gate() {
  if (!isAuthenticated()) {
    nav.classList.add("hidden");
    renderAuth(main);
    return;
  }
  ensureNav();
  // Если текущая вкладка недоступна — сбросить
  const visible = getVisibleTabs();
  if (!visible.find((t) => t.id === current)) {
    current = "client";
  }
  showTab(current);
}

// Перерисовка текущей вкладки при изменении данных
subscribe(() => {
  if (isAuthenticated()) { ensureNav(); showTab(current); }
});

// Переключение между экраном входа и приложением
subscribeAuth(gate);

// Обработка выхода (401 от API)
window.addEventListener("aina-logout", () => gate());

gate();
