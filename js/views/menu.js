// Вкладка «Меню»: меню по дням, 4–5 приёмов пищи с интервалами 2–3 часа,
// карточки блюд, итог за день по калориям и КБЖУ.
import { getState, update, targetCalories } from "../store.js";
import { mealPlan, mealTimes, dishTotals } from "../calc.js";
import { allowedProducts } from "../data.js";
import { dishServing, macroLine, ingList, progress, esc } from "../ui.js";

const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

export function renderMenu(root) {
  const s = getState();
  const r = s.regimen;
  const cal = targetCalories();
  const plan = mealPlan(r.mealsPerDay, cal);
  const times = mealTimes(r.firstMealTime, r.mealsPerDay, r.intervalHours);

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

  root.innerHTML = `<div class="days">${days}</div>`;
  bind(root, s);
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
        <label class="serv">Порции <input type="number" min="0.5" step="0.5" value="${meal.servings}" data-sv="${di}:${mi}" style="width:70px"></label>
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
}
