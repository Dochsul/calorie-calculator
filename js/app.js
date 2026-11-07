// Точка входа: навигация по вкладкам и первичный рендер.
import { subscribe } from "./store.js";
import { renderClient } from "./views/client.js";
import { renderMenu } from "./views/menu.js";
import { renderDishes } from "./views/dishes.js";
import { renderTemplates } from "./views/templates.js";
import { renderShopping } from "./views/shopping.js";

const TABS = [
  { id: "client", label: "Анкета", render: renderClient },
  { id: "menu", label: "Меню", render: renderMenu },
  { id: "dishes", label: "Блюда", render: renderDishes },
  { id: "templates", label: "Шаблоны", render: renderTemplates },
  { id: "shopping", label: "Покупки", render: renderShopping },
];

let current = "client";
const main = document.getElementById("app");

function show(id) {
  current = id;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  const view = TABS.find((t) => t.id === id);
  if (view) view.render(main);
}

const nav = document.getElementById("nav");
TABS.forEach((t) => {
  const b = document.createElement("button");
  b.className = "tab";
  b.dataset.tab = t.id;
  b.textContent = t.label;
  b.onclick = () => show(t.id);
  nav.appendChild(b);
});

// Перерисовываем текущую вкладку при изменении состояния
subscribe(() => {
  const view = TABS.find((t) => t.id === current);
  if (view) view.render(main);
});

show("client");
