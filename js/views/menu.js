// Вкладка «Меню»: автогенерация из продуктов дома, меню по дням,
// карточки блюд, замена блюда с пересчётом КБЖУ, сохранение.
import { getState, update, targetCalories, newDishId } from "../store.js";
import { mealPlan, mealTimes, dishTotals } from "../calc.js";
import { buildGeneratedMenu } from "../menu-gen.js";
import { dishServing, macroLine, ingList, progress, esc } from "../ui.js";

const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

export function renderMenu(root) {
  const s = getState();
  const r = s.regimen;
  const cal = targetCalories();
  const plan = mealPlan(r.mealsPerDay, cal);
  const times = mealTimes(r.firstMealTime, r.mealsPerDay, r.intervalHours);
  const pantryCount = (s.pantry?.productIds || []).length;

  const days = s.menu.days.map((day, di) => {
    let dKcal = 0, dP = 0, dF = 0, dC = 0;
    const meals = day.meals.map((meal, mi) => {
      const dish = s.dishes.find((d) => d.id === meal.dishId);
      const sv = dishServing(dish || { ingredients: [] }, meal.servings);
      if (dish) { dKcal += sv.kcal; dP += sv.p; dF += sv.f; dC += sv.c; }
      const target = plan[mi] ? plan[mi].kcal : 0;
      return mealSlot(di, mi, times[mi], plan[mi], meal, dish, s, target);
    }).join("");
    return `<section class="card day">
      <div class="card-head"><h2>День ${di + 1} — ${dayNames[di % 7]}</h2>
        <span class="day-tot">${Math.round(dKcal)} / ${cal} ккал</span></div>
      <div class="meals">${meals}</div>
      <div class="day-total">
        ${progress(dKcal, cal)}
        <div class="dt-nums">Итог: <b>${Math.round(dKcal)} ккал</b> · Б ${Math.round(dP)} · Ж ${Math.round(dF)} · У ${Math.round(dC)} г</div>
      </div>
    </section>`;
  }).join("");

  root.innerHTML = `
    <div class="menu-toolbar">
      <button class="btn primary" id="m_gen" ${pantryCount < 3 ? "disabled title='Отметьте минимум 3 продукта на вкладке Продукты дома'" : ""}>
        Сгенерировать из моих продуктов
      </button>
      <span class="hint">${pantryCount} продуктов дома · цель ${cal} ккал</span>
    </div>
    <div class="days">${days}</div>`;

  bind(root, s);
  root.querySelector("#m_gen").onclick = () => {
    const st = getState();
    const pantryIds = st.pantry?.productIds || [];
    if (pantryIds < 3) return;
    const result = buildGeneratedMenu(pantryIds, st.regimen, cal, newDishId);
    if (!result) { alert("Недостаточно продуктов для генерации меню"); return; }
    update((s) => {
      s.dishes = [...s.dishes, ...result.dishes];
      s.menu = { days: result.days };
    });
    renderMenu(root);
  };
}

function mealSlot(di, mi, time, planItem, meal, dish, s, target) {
  const dishOpts = s.dishes.map((d) => `<option value="${d.id}" ${meal.dishId === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("");
  let block = "";
  if (dish) {
    const sv = dishServing(dish, meal.servings);
    block = `
      <div class="slot-card">
        <ul class="dc-ings">${ingList(dish, meal.servings)}</ul>
        <div class="slot-stats">
          <span>${Math.round(sv.kcal)} / ${target} ккал</span>
          <span>${macroLine(sv)}</span>
          <span>готово: ${Math.round(sv.cookedMass)} г</span>
        </div>
        <div class="slot-actions">
          <label class="serv">Порции <input type="number" min="0.5" step="0.5" value="${meal.servings}" data-sv="${di}:${mi}" style="width:70px"></label>
          <button class="btn sm" data-replace="${di}:${mi}">Заменить</button>
        </div>
      </div>`;
  } else {
    block = `<div class="slot-empty">Блюдо не выбрано — цель ${target} ккал</div>`;
  }
  return `<div class="meal-slot">
    <div class="slot-head"><span class="slot-time">${time || ""}</span><span class="slot-name">${planItem ? planItem.name : ""}</span></div>
    <select class="slot-dish" data-dish="${di}:${mi}"><option value="">— выбрать блюдо —</option>${dishOpts}</select>
    ${block}
  </div>`;
}

function bind(root, s) {
  root.querySelectorAll("[data-dish]").forEach((sel) => {
    sel.onchange = (e) => {
      const [di, mi] = e.target.dataset.dish.split(":").map(Number);
      update((st) => { st.menu.days[di].meals[mi].dishId = e.target.value || null; });
      renderMenu(root);
    };
  });
  root.querySelectorAll("[data-sv]").forEach((inp) => {
    inp.oninput = (e) => {
      const [di, mi] = e.target.dataset.sv.split(":").map(Number);
      const v = parseFloat(e.target.value) || 1;
      update((st) => { st.menu.days[di].meals[mi].servings = v; });
      renderMenu(root);
    };
  });
  root.querySelectorAll("[data-replace]").forEach((btn) => {
    btn.onclick = () => {
      const [di, mi] = btn.dataset.replace.split(":").map(Number);
      showReplaceDialog(root, di, mi);
    };
  });
}

function showReplaceDialog(root, di, mi) {
  const s = getState();
  const currentDish = s.dishes.find((d) => d.id === s.menu.days[di].meals[mi].dishId);
  const mealName = mealPlan(s.regimen.mealsPerDay, targetCalories())[mi]?.name || "Обед";

  // Подходящие блюда для замены: той же категории или все
  const candidates = s.dishes.filter((d) => d.id !== currentDish?.id);
  const sameCat = candidates.filter((d) => d.category === mealName);
  const others = candidates.filter((d) => d.category !== mealName);
  const list = [...sameCat, ...others].slice(0, 12);

  if (!list.length) { alert("Нет других блюд для замены. Создайте блюда на вкладке «Блюда»."); return; }

  const items = list.map((d) => {
    const t = dishTotals(d);
    return `<div class="replace-row" data-dish-id="${d.id}">
      <div><b>${esc(d.name)}</b> <span class="tag">${esc(d.category)}</span></div>
      <div class="mass">${Math.round(t.kcal)} ккал · ${macroLine(t)}</div>
      <button class="btn sm primary">Выбрать</button>
    </div>`;
  }).join("");

  // Создаём модальное окно
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-card">
    <div class="card-head"><h2>Заменить блюдо</h2><button class="btn sm" id="rep_close">✕</button></div>
    ${currentDish ? `<p class="hint">Текущее: <b>${esc(currentDish.name)}</b> — ${Math.round(dishTotals(currentDish).kcal)} ккал</p>` : ""}
    <div class="replace-list">${items}</div>
  </div>`;
  root.appendChild(overlay);

  overlay.querySelector("#rep_close").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.querySelectorAll(".replace-row").forEach((row) => {
    row.querySelector("button").onclick = () => {
      const newDishId = row.dataset.dishId;
      update((st) => { st.menu.days[di].meals[mi].dishId = newDishId; });
      overlay.remove();
      renderMenu(root);
    };
  });
}
