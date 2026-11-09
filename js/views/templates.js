// Вкладка «Шаблоны»: сохранённые шаблоны блюд и меню, применение к меню.
import { getState, update, newDishId } from "../store.js";
import { esc } from "../ui.js";
import { checkDish } from "../dietary.js";

function tplDot(dish, restrictions) {
  const dc = checkDish(dish, restrictions);
  return dc.blocked
    ? `<span class="dc-dot dc-dot-block" title="Нарушение: ${esc(dc.violations.map((v) => v.reason).join(", "))}">●</span>`
    : dc.needsConfirmation
    ? `<span class="dc-dot dc-dot-unknown" title="Неизвестный состав">●</span>`
    : `<span class="dc-dot dc-dot-ok" title="Совместимо">●</span>`;
}

export function renderTemplates(root) {
  const s = getState();
  const dt = s.templates.dishes || [];
  const mt = s.templates.menus || [];

  const dishTpl = dt.length
    ? dt.map((d) => `<div class="tpl-row">
        <div>${tplDot(d, s.restrictions)}<b>${esc(d.name)}</b> <span class="tag">${esc(d.category)}</span>
          <span class="mass">${(d.ingredients || []).length} ингр.</span></div>
        <div class="tpl-actions">
          <button class="btn sm primary" data-add-dish="${d.id}">Добавить в блюда</button>
          <button class="btn sm" data-apply-day="${d.id}">В меню на день</button>
          <button class="btn sm danger" data-rm-dish="${d.id}">Удалить</button>
        </div></div>`).join("")
    : "<p class='hint'>Шаблонов блюд пока нет. Сохраните блюдо на вкладке «Блюда».</p>";

  const menuTpl = mt.length
    ? mt.map((m) => `<div class="tpl-row">
        <div><b>${esc(m.name)}</b> <span class="mass">${(m.days || []).length} дн.</span></div>
        <div class="tpl-actions">
          <button class="btn sm primary" data-apply-menu="${m.id}">Применить к меню</button>
          <button class="btn sm danger" data-rm-menu="${m.id}">Удалить</button>
        </div></div>`).join("")
    : "<p class='hint'>Шаблонов меню пока нет.</p>";

  root.innerHTML = `
    <div class="grid2">
      <section class="card">
        <div class="card-head"><h2>Шаблоны блюд</h2></div>
        ${dishTpl}
      </section>
      <section class="card">
        <div class="card-head"><h2>Шаблоны меню</h2>
          <button class="btn sm primary" id="save_menu">Сохранить текущее меню</button>
        </div>
        ${menuTpl}
      </section>
    </div>`;

  root.querySelector("#save_menu").onclick = () => {
    const name = prompt("Название шаблона меню:", "Меню недели");
    if (!name) return;
    update((s) => s.templates.menus.push({
      id: newDishId(),
      name,
      days: JSON.parse(JSON.stringify(s.menu.days)),
    }));
    renderTemplates(root);
  };
  root.querySelectorAll("[data-add-dish]").forEach((b) => (b.onclick = () => {
    const tpl = getState().templates.dishes.find((d) => d.id === b.dataset.addDish);
    update((s) => s.dishes.push({ id: newDishId(), name: tpl.name, category: tpl.category, note: "", ingredients: JSON.parse(JSON.stringify(tpl.ingredients)) }));
    alert("Блюдо добавлено из шаблона.");
  }));
  root.querySelectorAll("[data-apply-day]").forEach((b) => (b.onclick = () => {
    const tpl = getState().templates.dishes.find((d) => d.id === b.dataset.applyDay);
    update((s) => {
      const dish = { id: newDishId(), name: tpl.name, category: tpl.category, note: "", ingredients: JSON.parse(JSON.stringify(tpl.ingredients)) };
      s.dishes.push(dish);
      s.menu.days.forEach((d) => { const slot = d.meals.find((m) => !m.dishId); if (slot) slot.dishId = dish.id; });
    });
    renderTemplates(root);
  }));
  root.querySelectorAll("[data-apply-menu]").forEach((b) => (b.onclick = () => {
    const tpl = getState().templates.menus.find((m) => m.id === b.dataset.applyMenu);
    update((s) => {
      const remap = {};
      for (const day of tpl.days) {
        for (const meal of day.meals) {
          if (meal.dishId && !remap[meal.dishId]) {
            const orig = s.dishes.find((d) => d.id === meal.dishId);
            if (orig) { const nd = { id: newDishId(), name: orig.name, category: orig.category, note: orig.note, ingredients: JSON.parse(JSON.stringify(orig.ingredients)) }; s.dishes.push(nd); remap[meal.dishId] = nd.id; }
          }
        }
      }
      s.menu.days = tpl.days.map((day) => ({ meals: day.meals.map((m) => ({ dishId: remap[m.dishId] || m.dishId, servings: m.servings })) }));
      s.regimen.days = s.menu.days.length;
    });
    renderTemplates(root);
  }));
  root.querySelectorAll("[data-rm-dish]").forEach((b) => (b.onclick = () => { update((s) => { s.templates.dishes = s.templates.dishes.filter((d) => d.id !== b.dataset.rmDish); }); renderTemplates(root); }));
  root.querySelectorAll("[data-rm-menu]").forEach((b) => (b.onclick = () => { update((s) => { s.templates.menus = s.templates.menus.filter((m) => m.id !== b.dataset.rmMenu); }); renderTemplates(root); }));
}
