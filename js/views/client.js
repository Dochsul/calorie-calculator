// Вкладка «Анкета»: данные клиента, расчёт калорий/БЖУ, режим питания, ограничения
import { getState, update, targetCalories } from "../store.js";
import { calcCalories, calcMacros, mealPlan, mealTimes } from "../calc.js";

const GOALS = {
  maintain: "Поддержание веса",
  lose20: "Похудение (дефицит 20%)",
  lose15: "Похудение (дефицит 15%)",
  muscleGain: "Набор мышечной массы",
};

export function renderClient(root) {
  const s = getState();
  const c = s.client;
  const r = s.regimen;
  const x = s.restrictions;
  const cal = targetCalories();
  const macros = calcMacros(cal);
  const plan = mealPlan(r.mealsPerDay, cal);
  const times = mealTimes(r.firstMealTime, r.mealsPerDay, r.intervalHours);

  root.innerHTML = `
  <div class="grid2">
    <section class="card">
      <h2>Данные клиента</h2>
      <label>Имя<input id="c_name" value="${esc(c.name)}" placeholder="например, Анна"></label>
      <div class="row2">
        <label>Пол
          <select id="c_gender">
            <option value="female" ${c.gender === "female" ? "selected" : ""}>Женщина</option>
            <option value="male" ${c.gender === "male" ? "selected" : ""}>Мужчина</option>
          </select>
        </label>
        <label>Возраст<input id="c_age" type="number" min="10" max="120" value="${c.age}"></label>
      </div>
      <div class="row2">
        <label>Вес, кг<input id="c_weight" type="number" min="20" max="400" step="0.1" value="${c.weight}"></label>
        <label>Рост, см<input id="c_height" type="number" min="80" max="250" value="${c.height}"></label>
      </div>
      <label>Формула расчёта
        <select id="c_formula">
          <option value="mifflin" ${c.formula === "mifflin" ? "selected" : ""}>Миффлина-Сан Жеора</option>
          <option value="harris" ${c.formula === "harris" ? "selected" : ""}>Харриса-Бенедикта</option>
        </select>
      </label>
      <label>Цель
        <select id="c_goal">
          ${Object.entries(GOALS).map(([v, t]) => `<option value="${v}" ${c.goal === v ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <label>Активность
        <select id="c_activity">
          <option value="1.2" ${c.activity === "1.2" ? "selected" : ""}>Минимальная</option>
          <option value="1.375" ${c.activity === "1.375" ? "selected" : ""}>Лёгкая</option>
          <option value="1.55" ${c.activity === "1.55" ? "selected" : ""}>Средняя</option>
          <option value="1.725" ${c.activity === "1.725" ? "selected" : ""}>Высокая</option>
        </select>
      </label>
      <div class="checks">
        <label class="chk"><input type="checkbox" id="c_preg" ${c.pregnancy ? "checked" : ""}> Беременность (+300 ккал)</label>
        <label class="chk"><input type="checkbox" id="c_bf" ${c.breastfeeding ? "checked" : ""}> Грудное вскармливание (+500 ккал)</label>
        <label class="chk"><input type="checkbox" id="c_cycle" ${c.cycle ? "checked" : ""}> Менструальный цикл (+100 ккал)</label>
      </div>
      <label>Заметки<textarea id="c_notes" rows="2">${esc(c.notes)}</textarea></label>
    </section>

    <section class="card">
      <h2>Режим питания</h2>
      <label>Приёмов пищи в день
        <select id="r_meals">
          <option value="4" ${r.mealsPerDay === 4 ? "selected" : ""}>4 приёма</option>
          <option value="5" ${r.mealsPerDay === 5 ? "selected" : ""}>5 приёмов</option>
        </select>
      </label>
      <div class="row2">
        <label>Первый приём<input id="r_first" type="time" value="${r.firstMealTime}"></label>
        <label>Интервал, ч<input id="r_interval" type="number" min="2" max="3" step="0.5" value="${r.intervalHours}"></label>
      </div>
      <label>Дней в меню<input id="r_days" type="number" min="1" max="7" value="${r.days}"></label>
      <div class="hint">Интервал между приёмами 2–3 часа.</div>

      <h2 style="margin-top:18px">Ограничения</h2>
      <div class="checks">
        <label class="chk"><input type="checkbox" id="x_veg" ${x.vegetarian ? "checked" : ""}> Вегетарианство</label>
        <label class="chk"><input type="checkbox" id="x_vegan" ${x.vegan ? "checked" : ""}> Веганство</label>
        <label class="chk"><input type="checkbox" id="x_gf" ${x.glutenFree ? "checked" : ""}> Без глютена</label>
        <label class="chk"><input type="checkbox" id="x_df" ${x.dairyFree ? "checked" : ""}> Без молока</label>
      </div>
      <label>Аллергии (через запятую)<input id="x_allerg" value="${esc(x.allergies)}" placeholder="орехи, рыба"></label>
      <label>Нелюбимые продукты<input id="x_dis" value="${esc(x.dislikes)}" placeholder="печень, сельдерей"></label>
    </section>
  </div>

  <section class="card result-card">
    <h2>Индивидуальный расчёт</h2>
    <div class="hint" style="margin: -8px 0 14px">⚡ Калории и БЖУ считаются автоматически из данных выше. Измените вес, рост или цель — расчёт обновится.</div>
    <div class="metrics">
      <div class="metric big"><span>Калории</span><b>${Math.round(cal).toLocaleString("ru-RU")} ккал</b></div>
      <div class="metric"><span>Белки</span><b>${Math.round(macros.proteins)} г</b></div>
      <div class="metric"><span>Жиры</span><b>${Math.round(macros.fats)} г</b></div>
      <div class="metric"><span>Углеводы</span><b>${Math.round(macros.carbs)} г</b></div>
    </div>
    ${c.goal === "lose20" ? '<div class="hint">Применён дефицит 20%.</div>' : ""}
    <div class="plan">
      <h3>Распределение по приёмам пищи</h3>
      ${plan.map((m, i) => `<div class="plan-row"><span class="t">${times[i]}</span><span class="n">${m.name}</span><b>${m.kcal} ккал</b></div>`).join("")}
    </div>
  </section>`;

  bind(root);
}

function bind(root) {
  const num = (id) => root.querySelector("#" + id);
  const setClient = (patch) => update((s) => Object.assign(s.client, patch));
  const setRestr = (patch) => update((s) => Object.assign(s.restrictions, patch));

  const rebind = () => renderClient(root);
  // Обновляем только секцию расчёта без перерисовки формы — фокус ввода сохраняется
  const refreshCalc = () => {
    const s = getState();
    const cal = targetCalories();
    const macros = calcMacros(cal);
    const r = s.regimen;
    const plan = mealPlan(r.mealsPerDay, cal);
    const times = mealTimes(r.firstMealTime, r.mealsPerDay, r.intervalHours);

    const calEl = root.querySelector(".metric.big b");
    if (calEl) calEl.textContent = `${Math.round(cal).toLocaleString("ru-RU")} ккал`;
    const metricEls = root.querySelectorAll(".metric:not(.big) b");
    if (metricEls[0]) metricEls[0].textContent = `${Math.round(macros.proteins)} г`;
    if (metricEls[1]) metricEls[1].textContent = `${Math.round(macros.fats)} г`;
    if (metricEls[2]) metricEls[2].textContent = `${Math.round(macros.carbs)} г`;

    const planEl = root.querySelector(".plan");
    if (planEl) {
      planEl.innerHTML = `<h3>Распределение по приёмам пищи</h3>` +
        plan.map((m, i) => `<div class="plan-row"><span class="t">${times[i]}</span><span class="n">${m.name}</span><b>${m.kcal} ккал</b></div>`).join("");
    }

    const deficitHint = root.querySelector(".result-card .hint:last-of-type");
    if (deficitHint) {
      deficitHint.textContent = s.client.goal === "lose20" ? "Применён дефицит 20%." : "";
    }
  };

  num("c_name").oninput = (e) => setClient({ name: e.target.value });
  num("c_gender").onchange = (e) => { setClient({ gender: e.target.value }); rebind(); };
  num("c_age").oninput = (e) => { setClient({ age: parseFloat(e.target.value) || 0 }); refreshCalc(); };
  num("c_weight").oninput = (e) => { setClient({ weight: parseFloat(e.target.value) || 0 }); refreshCalc(); };
  num("c_height").oninput = (e) => { setClient({ height: parseFloat(e.target.value) || 0 }); refreshCalc(); };
  num("c_formula").onchange = (e) => { setClient({ formula: e.target.value }); rebind(); };
  num("c_goal").onchange = (e) => { setClient({ goal: e.target.value }); rebind(); };
  num("c_activity").onchange = (e) => { setClient({ activity: e.target.value }); rebind(); };
  num("c_preg").onchange = (e) => { setClient({ pregnancy: e.target.checked }); rebind(); };
  num("c_bf").onchange = (e) => { setClient({ breastfeeding: e.target.checked }); rebind(); };
  num("c_cycle").onchange = (e) => { setClient({ cycle: e.target.checked }); rebind(); };
  num("c_notes").oninput = (e) => setClient({ notes: e.target.value });

  num("x_veg").onchange = (e) => { setRestr({ vegetarian: e.target.checked }); rebind(); };
  num("x_vegan").onchange = (e) => { setRestr({ vegan: e.target.checked }); rebind(); };
  num("x_gf").onchange = (e) => { setRestr({ glutenFree: e.target.checked }); rebind(); };
  num("x_df").onchange = (e) => { setRestr({ dairyFree: e.target.checked }); rebind(); };
  num("x_allerg").oninput = (e) => setRestr({ allergies: e.target.value });
  num("x_dis").oninput = (e) => setRestr({ dislikes: e.target.value });

  num("r_meals").onchange = (e) => {
    const n = parseInt(e.target.value, 10);
    update((s) => {
      s.regimen.mealsPerDay = n;
      s.menu.days.forEach((d) => {
        while (d.meals.length < n) d.meals.push({ dishId: null, servings: 1 });
        while (d.meals.length > n) d.meals.pop();
      });
    });
    rebind();
  };
  num("r_first").onchange = (e) => { update((s) => (s.regimen.firstMealTime = e.target.value)); rebind(); };
  num("r_interval").onchange = (e) => { update((s) => (s.regimen.intervalHours = parseFloat(e.target.value) || 3)); rebind(); };
  num("r_days").onchange = (e) => {
    const n = Math.max(1, Math.min(7, parseInt(e.target.value, 10) || 1));
    update((s) => {
      s.regimen.days = n;
      const per = s.regimen.mealsPerDay;
      while (s.menu.days.length < n) s.menu.days.push({ meals: Array.from({ length: per }, () => ({ dishId: null, servings: 1 })) });
      while (s.menu.days.length > n) s.menu.days.pop();
    });
    rebind();
  };
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}
