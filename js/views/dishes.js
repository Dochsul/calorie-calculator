// Вкладка «Блюда»: создание/редактирование блюд, расчёт сухого/сырого и готового,
// замена продуктов и сравнение вариантов, сохранение как шаблон.
import { getState, update, newDishId } from "../store.js";
import { CATEGORIES, PRODUCT_MAP, getByCategory, alternatives, allowedProducts } from "../data.js";
import { dishTotals } from "../calc.js";
import { dishServing, macroLine, ingList, esc } from "../ui.js";
import { checkDish, checkProduct } from "../dietary.js";

let editingId = null;

export function renderDishes(root) {
  const s = getState();
  if (editingId && !s.dishes.find((d) => d.id === editingId)) editingId = null;

  if (editingId) return renderEditor(root, editingId);

  const cards = s.dishes.map(dishCard).join("");
  root.innerHTML = `
    <div class="card">
      <div class="card-head">
        <h2>Блюда</h2>
        <button class="btn primary" id="d_add">+ Новое блюдо</button>
      </div>
      <div class="dish-grid">${cards || "<p class='hint'>Пока нет блюд. Создайте первое.</p>"}</div>
    </div>`;

  root.querySelector("#d_add").onclick = () => {
    const id = newDishId();
    update((s) => s.dishes.push({ id, name: "Новое блюдо", category: "Обед", note: "", ingredients: [] }));
    editingId = id;
    renderDishes(root);
  };
  root.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { editingId = b.dataset.edit; renderDishes(root); }));
  root.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
    if (!confirm("Удалить блюдо?")) return;
    update((s) => {
      s.dishes = s.dishes.filter((d) => d.id !== b.dataset.del);
      s.menu.days.forEach((d) => d.meals.forEach((m) => { if (m.dishId === b.dataset.del) m.dishId = null; }));
    });
    renderDishes(root);
  }));
  root.querySelectorAll("[data-tpl]").forEach((b) => (b.onclick = () => {
    const d = getState().dishes.find((x) => x.id === b.dataset.tpl);
    update((s) => s.templates.dishes.push({ id: newDishId(), name: d.name + " (шаблон)", category: d.category, ingredients: JSON.parse(JSON.stringify(d.ingredients)) }));
    alert("Шаблон блюда сохранён.");
  }));
}

function dishCard(dish) {
  const t = dishTotals(dish);
  const dc = checkDish(dish, getState().restrictions);
  const warn = dc.blocked
    ? `<div class="dc-warn dc-warn-block">⚠ Нарушение: ${dc.violations.map((v) => esc(v.reason)).join(", ")}</div>`
    : dc.needsConfirmation
    ? `<div class="dc-warn dc-warn-unknown">⚠ Неизвестный состав: требуется подтверждение</div>`
    : "";
  return `<div class="dish-card${dc.blocked ? " dish-blocked" : ""}">
    <div class="dc-head"><b>${esc(dish.name)}</b><span class="tag">${esc(dish.category)}</span></div>
    ${warn}
    <ul class="dc-ings">${ingList(dish, 1)}</ul>
    <div class="dc-stats">
      <span>${Math.round(t.kcal)} ккал</span>
      <span>${macroLine(t)}</span>
      <span>готово: ${Math.round(t.cookedMass)} г</span>
    </div>
    <div class="dc-actions">
      <button class="btn sm" data-edit="${dish.id}">Изменить</button>
      <button class="btn sm" data-tpl="${dish.id}">В шаблон</button>
      <button class="btn sm danger" data-del="${dish.id}">Удалить</button>
    </div>
  </div>`;
}

function renderEditor(root, id) {
  const s = getState();
  const dish = s.dishes.find((d) => d.id === id);
  const t = dishTotals(dish);
  const rows = (dish.ingredients || []).map((ing, i) => ingRow(dish, ing, i)).join("");
  root.innerHTML = `
    <div class="card">
      <div class="card-head">
        <h2>Редактор блюда</h2>
        <button class="btn sm" id="e_back">← Назад</button>
      </div>
      <div class="row2">
        <label>Название<input id="e_name" value="${esc(dish.name)}"></label>
        <label>Категория приёма
          <select id="e_cat">
            ${["Завтрак", "Обед", "Перекус", "Полдник", "Ужин"].map((x) => `<option ${dish.category === x ? "selected" : ""}>${x}</option>`).join("")}
          </select>
        </label>
      </div>
      <h3>Ингредиенты</h3>
      <div id="ing_list">${rows || "<p class='hint'>Добавьте ингредиенты.</p>"}</div>
      <div class="add-ing">
        <select id="ai_cat">${CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
        <select id="ai_prod"></select>
        <input id="ai_g" type="number" min="1" value="100" style="width:90px">
        <button class="btn sm primary" id="ai_add">Добавить</button>
      </div>
      <div class="dish-summary">
        <div class="ds-total"><b>${Math.round(t.kcal)} ккал</b> · ${macroLine(t)}</div>
        <div class="ds-mass">Сырое: ${Math.round(t.rawMass)} г → Готовое: ${Math.round(t.cookedMass)} г</div>
      </div>
      <label>Заметка<textarea id="e_note" rows="2">${esc(dish.note)}</textarea></label>
    </div>`;

  fillProducts(root, allowedProducts(s.restrictions));
  root.querySelector("#ai_cat").onchange = () => fillProducts(root, allowedProducts(s.restrictions));
  root.querySelector("#ai_add").onclick = () => {
    const pid = root.querySelector("#ai_prod").value;
    const g = parseFloat(root.querySelector("#ai_g").value) || 100;
    update((s) => { const d = s.dishes.find((x) => x.id === id); d.ingredients.push({ productId: pid, grams: g }); });
    renderEditor(root, id);
  };
  root.querySelector("#e_name").oninput = (e) => update((s) => { s.dishes.find((x) => x.id === id).name = e.target.value; });
  root.querySelector("#e_cat").onchange = (e) => update((s) => { s.dishes.find((x) => x.id === id).category = e.target.value; });
  root.querySelector("#e_note").oninput = (e) => update((s) => { s.dishes.find((x) => x.id === id).note = e.target.value; });
  root.querySelector("#e_back").onclick = () => { editingId = null; renderDishes(root); };
  bindIngRows(root, id);
}

function ingRow(dish, ing, i) {
  const pr = PRODUCT_MAP[ing.productId];
  if (!pr) return "";
  const g = parseFloat(ing.grams) || 0;
  const cooked = Math.round(g * pr.yield);
  const alts = alternatives(ing.productId);
  const dc = checkProductRow(ing, i);
  return `<div class="ing-row" data-i="${i}">
    <div class="ing-main">
      <b>${esc(pr.name)}</b>
      <span class="cat">${esc(pr.cat)}</span>
      <span class="mass">${g} г ${pr.yield !== 1 ? `→ ${cooked} г гот.` : ""}</span>
    </div>
    ${dc}
    <div class="ing-nutri">${Math.round((pr.kcal * g) / 100)} ккал · Б${Math.round((pr.p * g) / 100)} Ж${Math.round((pr.f * g) / 100)} У${Math.round((pr.c * g) / 100)}</div>
    <div class="ing-ctrl">
      <input type="number" min="1" class="ig" value="${g}" style="width:80px" data-g="${ing.productId}">
      <button class="btn sm" data-cmp="${ing.productId}">Сравнить</button>
      <button class="btn sm" data-sub="${ing.productId}">Заменить</button>
      <button class="btn sm danger" data-rm="${i}">✕</button>
    </div>
    <div class="sub-box" data-sub-box="${ing.productId}" hidden></div>
  </div>`;
}

// Строка предупреждения о нарушении/неизвестном составе для одного ингредиента.
function checkProductRow(ing, i) {
  const r = getState().restrictions;
  const check = checkProduct(ing.productId, r);
  if (check.violations.length) {
    return `<div class="ing-warn ing-warn-block">⚠ ${check.violations.map((v) => esc(v.reason)).join(", ")}</div>`;
  }
  if (check.unknown.length && !ing.confirmedSafe) {
    return `<div class="ing-warn ing-warn-unknown">⚠ Неизвестный состав
      <button class="btn sm" data-confirm="${i}">Подтвердить безопасность</button></div>`;
  }
  if (ing.confirmedSafe) {
    return `<div class="ing-warn ing-warn-confirmed">✓ Безопасность подтверждена</div>`;
  }
  return "";
}

function bindIngRows(root, id) {
  root.querySelectorAll(".ig").forEach((inp) => {
    inp.oninput = (e) => {
      const pid = e.target.dataset.g;
      const v = parseFloat(e.target.value) || 0;
      update((s) => {
        const d = s.dishes.find((x) => x.id === id);
        const ing = d.ingredients.find((x) => x.productId === pid);
        if (ing) ing.grams = v;
      });
      // мягкое обновление сводки без перерисовки строк (сохраняет фокус)
      updateSummary(root, id);
    };
  });
  root.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => {
    const i = parseInt(b.dataset.rm, 10);
    update((s) => { const d = s.dishes.find((x) => x.id === id); d.ingredients.splice(i, 1); });
    renderEditor(root, id);
  }));
  root.querySelectorAll("[data-sub]").forEach((b) => (b.onclick = () => toggleSub(root, id, b.dataset.sub, "sub")));
  root.querySelectorAll("[data-cmp]").forEach((b) => (b.onclick = () => toggleSub(root, id, b.dataset.cmp, "cmp")));
  root.querySelectorAll("[data-confirm]").forEach((b) => (b.onclick = () => {
    const i = parseInt(b.dataset.confirm, 10);
    update((s) => { const d = s.dishes.find((x) => x.id === id); if (d.ingredients[i]) d.ingredients[i].confirmedSafe = true; });
    renderEditor(root, id);
  }));
}

function toggleSub(root, id, pid, mode) {
  const box = root.querySelector(`[data-sub-box="${pid}"]`);
  if (!box) return;
  if (box.hidden) {
    const pr = PRODUCT_MAP[pid];
    const alts = alternatives(pid);
    const cur = alts.map((a) => "").join("");
    const rows = alts.map((a) => {
      const diff = a.kcal - pr.kcal;
      return `<div class="alt-row">
        <div><b>${esc(a.name)}</b> <span class="mass">${a.kcal} ккал · Б${a.p} Ж${a.f} У${a.c}</span></div>
        <div><span class="delta ${diff < 0 ? "less" : "more"}">${diff >= 0 ? "+" : ""}${diff} ккал/100г</span></div>
        ${mode === "sub" ? `<button class="btn sm primary" data-swap="${pid}" data-new="${a.id}">Заменить</button>` : ""}
      </div>`;
    }).join("");
    box.innerHTML = `<div class="alt-cur">Текущий: <b>${esc(pr.name)}</b> — ${pr.kcal} ккал · Б${pr.p} Ж${pr.f} У${pr.c} (на 100 г сырого)</div>${rows || "<p class='hint'>Альтернатив нет.</p>"}`;
    box.hidden = false;
    box.querySelectorAll("[data-swap]").forEach((btn) => (btn.onclick = () => {
      update((s) => {
        const d = s.dishes.find((x) => x.id === id);
        const ing = d.ingredients.find((x) => x.productId === btn.dataset.swap);
        if (ing) ing.productId = btn.dataset.new;
      });
      renderEditor(root, id);
    }));
  } else {
    box.hidden = true;
  }
}

function fillProducts(root, list) {
  const cat = root.querySelector("#ai_cat").value;
  const sel = root.querySelector("#ai_prod");
  const items = list.filter((p) => p.cat === cat);
  sel.innerHTML = items.map((p) => `<option value="${p.id}">${esc(p.name)} (${p.kcal} ккал)</option>`).join("") || "<option>—</option>";
}

function updateSummary(root, id) {
  const dish = getState().dishes.find((d) => d.id === id);
  const t = dishTotals(dish);
  const sum = root.querySelector(".ds-total");
  const mass = root.querySelector(".ds-mass");
  if (sum) sum.innerHTML = `<b>${Math.round(t.kcal)} ккал</b> · ${macroLine(t)}`;
  if (mass) mass.textContent = `Сырое: ${Math.round(t.rawMass)} г → Готовое: ${Math.round(t.cookedMass)} г`;
}
