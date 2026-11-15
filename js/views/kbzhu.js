// Панель КБЖУ: карточки с калориями, белками/жирами/углеводами (граммы + %),
// графическое отображение БЖУ, распределение по приёмам пищи,
// переключение авто/ручной режим.

import { getState, update, targetCalories, targetMacros } from "../store.js";
import {
  calcCalories, calcMacros, macroPercents, macroEnergy,
  gramsFromPercents, macroCalorieDiscrepancy, validateMacros,
  mealPlan, mealTimes,
} from "../calc.js";
import { esc } from "../ui.js";

export function renderKbzhu(root) {
  const s = getState();
  const ms = s.macroSettings || {};
  const c = s.client;
  const cal = targetCalories();
  const macros = targetMacros();
  const p = Math.round(macros.proteins);
  const f = Math.round(macros.fats);
  const carb = Math.round(macros.carbs);
  const pct = macroPercents(p, f, carb);
  const energy = macroEnergy(p, f, carb);
  const mealsCount = ms.mealsPerDay || s.regimen.mealsPerDay;
  const plan = mealPlan(mealsCount, cal, macros);
  const times = mealTimes(s.regimen.firstMealTime, mealsCount, s.regimen.intervalHours);
  const disc = macroCalorieDiscrepancy(cal, p, f, carb);
  const validation = validateMacros(cal, p, f, carb, c);

  const mode = ms.mode || "auto";
  const isManual = mode === "manual";

  root.innerHTML = `
  <section class="card kbzhu-panel">
    <div class="kbzhu-header">
      <h2>Мой КБЖУ</h2>
      <div class="mode-switch">
        <button class="mode-btn ${!isManual ? "active" : ""}" data-mode="auto">Авто</button>
        <button class="mode-btn ${isManual ? "active" : ""}" data-mode="manual">Ручной</button>
      </div>
    </div>

    <div class="kbzhu-cards">
      <div class="kbzhu-card kbzhu-cal">
        <div class="kbzhu-card-label">Калорийность</div>
        <div class="kbzhu-card-value">${cal.toLocaleString("ru-RU")}</div>
        <div class="kbzhu-card-unit">ккал/день</div>
      </div>
      <div class="kbzhu-card kbzhu-protein">
        <div class="kbzhu-card-label">Белки</div>
        <div class="kbzhu-card-value">${p}</div>
        <div class="kbzhu-card-unit">${p} г · ${Math.round(pct.protein)}%</div>
      </div>
      <div class="kbzhu-card kbzhu-fat">
        <div class="kbzhu-card-label">Жиры</div>
        <div class="kbzhu-card-value">${f}</div>
        <div class="kbzhu-card-unit">${f} г · ${Math.round(pct.fat)}%</div>
      </div>
      <div class="kbzhu-card kbzhu-carb">
        <div class="kbzhu-card-label">Углеводы</div>
        <div class="kbzhu-card-value">${carb}</div>
        <div class="kbzhu-card-unit">${carb} г · ${Math.round(pct.carb)}%</div>
      </div>
    </div>

    <!-- Графическое отображение БЖУ — энергетическая диаграмма -->
    <div class="kbzhu-chart">
      <div class="kbzhu-chart-title">Энергетический вклад БЖУ</div>
      <div class="kbzhu-bar-wrap">
        <div class="kbzhu-bar">
          <div class="kbzhu-seg protein" style="width:${pct.protein}%" title="Белки ${Math.round(pct.protein)}%"></div>
          <div class="kbzhu-seg fat" style="width:${pct.fat}%" title="Жиры ${Math.round(pct.fat)}%"></div>
          <div class="kbzhu-seg carb" style="width:${pct.carb}%" title="Углеводы ${Math.round(pct.carb)}%"></div>
        </div>
      </div>
      <div class="kbzhu-legend">
        <span class="lg lg-protein"><span class="dot"></span>Белки ${Math.round(pct.protein)}% (${Math.round(energy.protein)} ккал)</span>
        <span class="lg lg-fat"><span class="dot"></span>Жиры ${Math.round(pct.fat)}% (${Math.round(energy.fat)} ккал)</span>
        <span class="lg lg-carb"><span class="dot"></span>Углеводы ${Math.round(pct.carb)}% (${Math.round(energy.carb)} ккал)</span>
      </div>
      <div class="kbzhu-sum">Суммарная энергетическая доля: <b>${Math.round(pct.protein + pct.fat + pct.carb)}%</b></div>
    </div>

    ${disc.diff !== 0 ? `
      <div class="kbzhu-discrepancy ${disc.diff > 0 ? "over" : "under"}">
        <span>⚠ Расхождение: граммы БЖУ дают ${disc.actual} ккал, а цель — ${disc.target} ккал (${disc.diff > 0 ? "+" : ""}${disc.diff} ккал, ${disc.diffPct > 0 ? "+" : ""}${disc.diffPct}%).</span>
        <button class="btn sm" id="kbzhu_recalc">Пересчитать граммы</button>
      </div>` : ""}

    ${!validation.safe ? `<div class="kbzhu-warnings">${validation.warnings.map((w) => `<p>⚠ ${esc(w)}</p>`).join("")}</div>` : ""}

    ${isManual ? renderManualForm(ms, cal, c) : `<div class="kbzhu-auto-info">Рассчитано по анкете: ${esc(GOAL_LABELS[c.goal] || "поддержание веса")}, активность ${esc(ACTIVITY_LABELS[c.activity] || "1.375")}.</div>`}

    <!-- Распределение по приёмам пищи -->
    <div class="kbzhu-meals">
      <h3>Распределение по приёмам пищи (${mealsCount})</h3>
      <div class="kbzhu-meal-list">
        ${plan.map((m, i) => `
          <div class="kbzhu-meal-row">
            <span class="meal-time">${times[i] || ""}</span>
            <span class="meal-name">${esc(m.name)}</span>
            <span class="meal-kcal">${m.kcal} ккал</span>
            <span class="meal-macros">Б ${m.proteins} · Ж ${m.fats} · У ${m.carbs} г</span>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="kbzhu-save-row">
      <label class="chk"><input type="checkbox" id="kbzhu_save" ${ms.saved ? "checked" : ""}> Сохранить мои настройки КБЖУ</label>
    </div>
  </section>`;

  bindKbzhu(root, ms);
}

function renderManualForm(ms, cal, c) {
  const savedCal = ms.calories || cal;
  const savedP = ms.proteins || Math.round((cal * 0.3) / 4);
  const savedF = ms.fats || Math.round((cal * 0.3) / 9);
  const savedC = ms.carbs || Math.round((cal * 0.4) / 4);
  const savedPctP = ms.proteinPct || 30;
  const savedPctF = ms.fatPct || 30;
  const savedPctC = ms.carbPct || 40;

  return `
  <div class="kbzhu-manual">
    <h3>Ручная настройка</h3>
    <div class="row2">
      <label>Калорийность, ккал<input type="number" id="kbzhu_cal" min="800" max="5000" step="10" value="${savedCal}"></label>
      <label>Приёмов пищи
        <select id="kbzhu_meals">
          ${[3, 4, 5].map((n) => `<option value="${n}" ${ms.mealsPerDay === n ? "selected" : ""}>${n} приёма</option>`).join("")}
        </select>
      </label>
    </div>

    <div class="kbzhu-input-mode">
      <div class="kbzhu-tabs">
        <button class="kbzhu-tab active" data-itab="grams">В граммах</button>
        <button class="kbzhu-tab" data-itab="pct">В процентах</button>
      </div>

      <div class="kbzhu-grams-form">
        <div class="row3">
          <label>Белки, г<input type="number" id="kbzhu_p" min="0" step="1" value="${savedP}"></label>
          <label>Жиры, г<input type="number" id="kbzhu_f" min="0" step="1" value="${savedF}"></label>
          <label>Углеводы, г<input type="number" id="kbzhu_c" min="0" step="1" value="${savedC}"></label>
        </div>
        <div class="kbzhu-auto-pct">
          <span class="hint">Энергетические проценты: Б <b id="auto_pct_p">${savedPctP}</b>% · Ж <b id="auto_pct_f">${savedPctF}</b>% · У <b id="auto_pct_c">${savedPctC}</b>%</span>
        </div>
      </div>

      <div class="kbzhu-pct-form" hidden>
        <div class="row3">
          <label>Белки, %<input type="number" id="kbzhu_pp" min="0" max="100" step="1" value="${savedPctP}"></label>
          <label>Жиры, %<input type="number" id="kbzhu_fp" min="0" max="100" step="1" value="${savedPctF}"></label>
          <label>Углеводы, %<input type="number" id="kbzhu_cp" min="0" max="100" step="1" value="${savedPctC}"></label>
        </div>
        <div class="kbzhu-auto-grams">
          <span class="hint">Граммы: Б <b id="auto_g_p">${savedP}</b> г · Ж <b id="auto_g_f">${savedF}</b> г · У <b id="auto_g_c">${savedC}</b> г</span>
        </div>
      </div>
    </div>
  </div>`;
}

function bindKbzhu(root, ms) {
  // Переключение режима
  root.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.onclick = () => {
      const newMode = btn.dataset.mode;
      update((s) => {
        s.macroSettings = s.macroSettings || {};
        s.macroSettings.mode = newMode;
        if (newMode === "manual" && !s.macroSettings.calories) {
          s.macroSettings.calories = targetCalories();
          const m = calcMacros(s.macroSettings.calories);
          s.macroSettings.proteins = Math.round(m.proteins);
          s.macroSettings.fats = Math.round(m.fats);
          s.macroSettings.carbs = Math.round(m.carbs);
        }
      });
    };
  });

  // Сохранить настройки
  const saveChk = root.querySelector("#kbzhu_save");
  if (saveChk) {
    saveChk.onchange = () => {
      update((s) => {
        s.macroSettings = s.macroSettings || {};
        s.macroSettings.saved = saveChk.checked;
      });
    };
  }

  // Пересчёт граммов
  const recalc = root.querySelector("#kbzhu_recalc");
  if (recalc) {
    recalc.onclick = () => {
      update((s) => {
        const cal = targetCalories();
        const m = calcMacros(cal);
        s.macroSettings.proteins = Math.round(m.proteins);
        s.macroSettings.fats = Math.round(m.fats);
        s.macroSettings.carbs = Math.round(m.carbs);
      });
    };
  }

  // Ручной режим: вкладки граммы/проценты
  root.querySelectorAll("[data-itab]").forEach((tab) => {
    tab.onclick = () => {
      root.querySelectorAll("[data-itab]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isGrams = tab.dataset.itab === "grams";
      root.querySelector(".kbzhu-grams-form").hidden = !isGrams;
      root.querySelector(".kbzhu-pct-form").hidden = isGrams;
    };
  });

  // Ввод граммов → пересчёт процентов
  const calInput = root.querySelector("#kbzhu_cal");
  const pInput = root.querySelector("#kbzhu_p");
  const fInput = root.querySelector("#kbzhu_f");
  const cInput = root.querySelector("#kbzhu_c");
  const ppInput = root.querySelector("#kbzhu_pp");
  const fpInput = root.querySelector("#kbzhu_fp");
  const cpInput = root.querySelector("#kbzhu_cp");
  const mealsSelect = root.querySelector("#kbzhu_meals");

  function updateGrams() {
    const cal = parseFloat(calInput?.value) || 0;
    const p = parseFloat(pInput?.value) || 0;
    const f = parseFloat(fInput?.value) || 0;
    const c = parseFloat(cInput?.value) || 0;
    const pct = macroPercents(p, f, c);
    const ap = root.querySelector("#auto_pct_p");
    const af = root.querySelector("#auto_pct_f");
    const ac = root.querySelector("#auto_pct_c");
    if (ap) ap.textContent = Math.round(pct.protein);
    if (af) af.textContent = Math.round(pct.fat);
    if (ac) ac.textContent = Math.round(pct.carb);
    saveManual(cal, p, f, c, Math.round(pct.protein), Math.round(pct.fat), Math.round(pct.carb));
  }

  function updatePcts() {
    const cal = parseFloat(calInput?.value) || 0;
    const pp = parseFloat(ppInput?.value) || 0;
    const fp = parseFloat(fpInput?.value) || 0;
    const cp = parseFloat(cpInput?.value) || 0;
    const g = gramsFromPercents(cal, pp, fp, cp);
    const gp = root.querySelector("#auto_g_p");
    const gf = root.querySelector("#auto_g_f");
    const gc = root.querySelector("#auto_g_c");
    if (gp) gp.textContent = Math.round(g.proteins);
    if (gf) gf.textContent = Math.round(g.fats);
    if (gc) gc.textContent = Math.round(g.carbs);
    saveManual(cal, Math.round(g.proteins), Math.round(g.fats), Math.round(g.carbs), pp, fp, cp);
  }

  function saveManual(cal, p, f, c, pp, fp, cp) {
    update((s) => {
      s.macroSettings = s.macroSettings || {};
      s.macroSettings.calories = cal;
      s.macroSettings.proteins = p;
      s.macroSettings.fats = f;
      s.macroSettings.carbs = c;
      s.macroSettings.proteinPct = pp;
      s.macroSettings.fatPct = fp;
      s.macroSettings.carbPct = cp;
    });
  }

  if (calInput) calInput.oninput = () => { if (root.querySelector(".kbzhu-pct-form").hidden) updateGrams(); else updatePcts(); };
  if (pInput) pInput.oninput = updateGrams;
  if (fInput) fInput.oninput = updateGrams;
  if (cInput) cInput.oninput = updateGrams;
  if (ppInput) ppInput.oninput = updatePcts;
  if (fpInput) ppInput.oninput = updatePcts;
  if (cpInput) cpInput.oninput = updatePcts;

  if (mealsSelect) {
    mealsSelect.onchange = () => {
      update((s) => {
        s.macroSettings = s.macroSettings || {};
        s.macroSettings.mealsPerDay = parseInt(mealsSelect.value, 10);
      });
    };
  }
}

const GOAL_LABELS = {
  maintain: "поддержание веса",
  lose20: "похудение (−20%)",
  lose15: "похудение (−15%)",
  muscleGain: "набор мышечной массы",
};

const ACTIVITY_LABELS = {
  "1.2": "минимальная",
  "1.375": "лёгкая",
  "1.55": "средняя",
  "1.725": "высокая",
};
