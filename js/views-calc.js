/**
 * AINA MENU — Калькулятор КБЖУ
 */

Views.calculator = function() {
  const q = Store.getQuestionnaire();
  const saved = Store.getCalcResults();
  const s1 = q?.step1 || {};
  const s6 = q?.step6 || {};
  const s2 = q?.step2 || {};

  // Defaults from questionnaire
  const def = saved || {
    gender: s1.gender || 'female',
    age: s1.age || 30,
    height: s1.height || 165,
    weight: s1.weight || 65,
    activity: s6.activity || 'light',
    goal: (s2.goals && s2.goals[0]) || 'lose',
    deficit: 20,
    formula: 'mifflin',
    macroMode: 'percent',
    pPct: 30, fPct: 30, cPct: 40,
    proteinPerKg: 1.6, fatPerKg: 1.0,
    customKcal: null,
  };

  const render = () => {
    let html = `
      <h1 class="page-title">Калькулятор КБЖУ</h1>
      <p class="page-subtitle">Персональный расчёт калорий и макронутриентов</p>

      <div class="card">
        <div class="card-title">📐 Параметры</div>
        <div class="form-group">
          <label class="form-label">Формула</label>
          <select class="form-select" id="calc-formula" onchange="window._calcUpdate()">
            <option value="mifflin" ${def.formula === 'mifflin' ? 'selected' : ''}>Mifflin–St Jeor (рекомендуется)</option>
            <option value="harris" ${def.formula === 'harris' ? 'selected' : ''}>Harris-Benedict (пересмотрённая)</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Пол</label>
            <select class="form-select" id="calc-gender" onchange="window._calcUpdate()">
              <option value="female" ${def.gender === 'female' ? 'selected' : ''}>Женский</option>
              <option value="male" ${def.gender === 'male' ? 'selected' : ''}>Мужской</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Возраст</label><input class="form-input" type="number" id="calc-age" value="${def.age}" min="1" max="120" oninput="window._calcUpdate()"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Рост (см)</label><input class="form-input" type="number" id="calc-height" value="${def.height}" min="80" max="250" oninput="window._calcUpdate()"></div>
          <div class="form-group"><label class="form-label">Вес (кг)</label><input class="form-input" type="number" step="0.1" id="calc-weight" value="${def.weight}" min="20" max="300" oninput="window._calcUpdate()"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Уровень активности</label>
          <select class="form-select" id="calc-activity" onchange="window._calcUpdate()">
            ${Object.entries(ACTIVITY_FACTORS).map(([k, v]) => `<option value="${k}" ${def.activity === k ? 'selected' : ''}>${v.label} (×${v.value})</option>`).join('')}
          </select>
          <div class="form-hint">Коэффициенты — ориентиры, допускающие уточнение, а не точное определение расхода</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🎯 Цель</div>
        <div class="form-group">
          <label class="form-label">Выберите цель</label>
          <select class="form-select" id="calc-goal" onchange="window._calcUpdate()">
            <option value="lose" ${def.goal === 'lose' ? 'selected' : ''}>Снижение веса</option>
            <option value="maintain" ${def.goal === 'maintain' ? 'selected' : ''}>Поддержание веса</option>
            <option value="gain" ${def.goal === 'gain' ? 'selected' : ''}>Набор массы</option>
            <option value="waist" ${def.goal === 'waist' ? 'selected' : ''}>Снижение окружности талии</option>
            <option value="fat" ${def.goal === 'fat' ? 'selected' : ''}>Уменьшение жировой массы</option>
          </select>
        </div>
        <div class="form-group" id="deficit-group">
          <label class="form-label">Дефицит / профицит</label>
          <div class="chip-group">
            <div class="chip ${def.deficit === 10 ? 'selected' : ''}" onclick="window._calcSetDeficit(10)">10%</div>
            <div class="chip ${def.deficit === 15 ? 'selected' : ''}" onclick="window._calcSetDeficit(15)">15%</div>
            <div class="chip ${def.deficit === 20 ? 'selected' : ''}" onclick="window._calcSetDeficit(20)">20%</div>
            <div class="chip ${def.deficit === 25 ? 'selected' : ''}" onclick="window._calcSetDeficit(25)">25%</div>
          </div>
          <div class="form-hint">20% означает снижение суточной потребности на 20%, а не массы тела на 20%</div>
        </div>
        <div class="form-group">
          <label class="form-label">Индивидуальная корректировка (ккал/день) — необязательно</label>
          <input class="form-input" type="number" id="calc-custom" value="${def.customKcal || ''}" placeholder="Оставьте пустым для автоматического расчёта" oninput="window._calcUpdate()">
          <div class="form-hint">Специалист может задать точное значение калорийности</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🥩 Распределение БЖУ</div>
        <div class="form-group">
          <label class="form-label">Режим расчёта</label>
          <select class="form-select" id="calc-macroMode" onchange="window._calcUpdate()">
            <option value="percent" ${def.macroMode === 'percent' ? 'selected' : ''}>В процентах (30/30/40 по умолчанию)</option>
            <option value="perkg" ${def.macroMode === 'perkg' ? 'selected' : ''}>На грамм/кг массы тела</option>
          </select>
        </div>
        <div id="macro-percent" ${def.macroMode !== 'percent' ? 'style="display:none"' : ''}>
          <div class="form-row-3">
            <div class="form-group"><label class="form-label">Белки %</label><input class="form-input" type="number" id="calc-pPct" value="${def.pPct}" min="10" max="60" oninput="window._calcUpdate()"></div>
            <div class="form-group"><label class="form-label">Жиры %</label><input class="form-input" type="number" id="calc-fPct" value="${def.fPct}" min="10" max="60" oninput="window._calcUpdate()"></div>
            <div class="form-group"><label class="form-label">Углеводы %</label><input class="form-input" type="number" id="calc-cPct" value="${def.cPct}" min="10" max="70" oninput="window._calcUpdate()"></div>
          </div>
        </div>
        <div id="macro-perkg" ${def.macroMode !== 'perkg' ? 'style="display:none"' : ''}>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Белки г/кг</label><input class="form-input" type="number" step="0.1" id="calc-proteinPerKg" value="${def.proteinPerKg}" min="0.5" max="3" oninput="window._calcUpdate()"></div>
            <div class="form-group"><label class="form-label">Жиры г/кг</label><input class="form-input" type="number" step="0.1" id="calc-fatPerKg" value="${def.fatPerKg}" min="0.3" max="2" oninput="window._calcUpdate()"></div>
          </div>
          <div class="form-hint">Остаток калорий пойдёт на углеводы</div>
        </div>
      </div>

      <div class="card" id="calc-results">
        ${renderResults(def)}
      </div>

      <div class="card">
        <div class="card-title">📋 Пояснения</div>
        <div class="alert alert-info">
          <strong>Mifflin–St Jeor:</strong> BMR = 10×вес + 6.25×рост − 5×возраст ${def.gender === 'male' ? '+ 5' : '− 161'}
        </div>
        <div class="alert alert-info">
          <strong>Harris-Benedict (пересмотр.):</strong> Для взрослых. TDEE = BMR × коэффициент активности.
        </div>
        <div class="alert alert-info">
          <strong>Энергетическая ценность:</strong> белки 4 ккал/г, жиры 9 ккал/г, углеводы 4 ккал/г.
        </div>
        <div class="alert alert-warning">
          <strong>Важно:</strong> для детей, подростков, беременных, кормящих и пациентов со специальными медицинскими потребностями обычный взрослый алгоритм не применяется автоматически.
        </div>
      </div>

      <button class="btn btn-gold btn-block btn-lg" onclick="window._calcSave()">Сохранить расчёт</button>
      <div class="mb-4"></div>`;

    App.render(html);
  };

  const renderResults = (params) => {
    const bmr = params.formula === 'harris'
      ? Calc.bmrHarrisBenedict(params.gender, params.weight, params.height, params.age)
      : Calc.bmrMifflin(params.gender, params.weight, params.height, params.age);
    const tdee = Calc.tdee(bmr, params.activity);
    const target = params.customKcal
      ? +params.customKcal
      : Calc.targetCalories(tdee, params.goal, params.deficit);
    const bmi = Calc.bmi(params.weight, params.height);

    let macros;
    if (params.macroMode === 'perkg') {
      macros = Calc.macrosByKg(target, params.weight, params.proteinPerKg, params.fatPerKg);
    } else {
      macros = Calc.macrosByPercent(target, params.pPct, params.fPct, params.cPct);
    }
    const cons = Calc.checkConsistency(target, macros.protein, macros.fat, macros.carbs);

    let html = `
      <div class="card-title">📊 Результаты</div>
      <div class="result-grid">
        <div class="result-tile"><div class="label">BMR (основной обмен)</div><div class="value">${Math.round(bmr)}</div><div class="unit">ккал/день</div></div>
        <div class="result-tile"><div class="label">TDEE (суточный расход)</div><div class="value">${Math.round(tdee)}</div><div class="unit">ккал/день</div></div>
        <div class="result-tile" style="grid-column:span 2;background:linear-gradient(135deg,var(--emerald) 0%,var(--emerald-dark) 100%);border:none;color:white">
          <div class="label" style="color:var(--gold-light)">Целевая калорийность</div>
          <div class="value" style="color:white">${target}</div><div class="unit" style="color:rgba(255,255,255,.8)">ккал/день</div>
        </div>
      </div>
      <div class="macro-bar">
        <div class="seg-p" style="flex:${params.pPct || 30}"></div>
        <div class="seg-f" style="flex:${params.fPct || 30}"></div>
        <div class="seg-c" style="flex:${params.cPct || 40}"></div>
      </div>
      <div class="macro-legend">
        <span><span class="dot" style="background:var(--emerald)"></span>Белки ${macros.protein} г</span>
        <span><span class="dot" style="background:var(--gold)"></span>Жиры ${macros.fat} г</span>
        <span><span class="dot" style="background:var(--emerald-light)"></span>Углеводы ${macros.carbs} г</span>
      </div>
      <div class="result-grid mt-4">
        <div class="result-tile"><div class="label">ИМТ</div><div class="value">${bmi.value}</div><div class="unit">${bmi.category}</div></div>
        <div class="result-tile"><div class="label">Клетчатка (ориентир)</div><div class="value">${Math.round(params.weight * 0.014 * 10) / 10}</div><div class="unit">г/день (14г/1000ккал)</div></div>
      </div>`;

    if (macros.warning) html += `<div class="alert alert-danger mt-2">${macros.warning}</div>`;
    if (!cons.ok) html += `<div class="alert alert-warning mt-2">⚠️ Сумма БЖУ (${cons.calc} ккал) не совпадает с целевой калорийностью (${target} ккал). Расхождение: ${cons.pct}%</div>`;

    return html;
  };

  // Live update
  window._calcUpdate = () => {
    const p = _calcCollect();
    // Toggle macro mode visibility
    document.getElementById('macro-percent').style.display = p.macroMode === 'percent' ? '' : 'none';
    document.getElementById('macro-perkg').style.display = p.macroMode === 'perkg' ? '' : 'none';
    document.getElementById('calc-results').innerHTML = renderResults(p);
  };
  window._calcSetDeficit = (d) => {
    document.getElementById('calc-custom').value = '';
    def.deficit = d;
    document.querySelectorAll('#deficit-group .chip').forEach(c => c.classList.toggle('selected', +c.textContent.replace('%', '') === d));
    window._calcUpdate();
  };
  const _calcCollect = () => {
    const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const n = id => { const el = document.getElementById(id); return el ? +el.value : 0; };
    return {
      formula: g('calc-formula'),
      gender: g('calc-gender'),
      age: n('calc-age'), height: n('calc-height'), weight: n('calc-weight'),
      activity: g('calc-activity'),
      goal: g('calc-goal'),
      deficit: def.deficit,
      macroMode: g('calc-macroMode'),
      pPct: n('calc-pPct'), fPct: n('calc-fPct'), cPct: n('calc-cPct'),
      proteinPerKg: n('calc-proteinPerKg'), fatPerKg: n('calc-fatPerKg'),
      customKcal: g('calc-custom') ? +g('calc-custom') : null,
    };
  };
  window._calcSave = () => {
    const p = _calcCollect();
    const bmr = p.formula === 'harris'
      ? Calc.bmrHarrisBenedict(p.gender, p.weight, p.height, p.age)
      : Calc.bmrMifflin(p.gender, p.weight, p.height, p.age);
    const tdee = Calc.tdee(bmr, p.activity);
    const target = p.customKcal || Calc.targetCalories(tdee, p.goal, p.deficit);
    const macros = p.macroMode === 'perkg'
      ? Calc.macrosByKg(target, p.weight, p.proteinPerKg, p.fatPerKg)
      : Calc.macrosByPercent(target, p.pPct, p.fPct, p.cPct);
    Store.saveCalcResults({ ...p, bmr: Math.round(bmr), tdee: Math.round(tdee), targetKcal: target, macros });
    App.toast('Расчёт сохранён');
    App.navigate('/');
  };

  render();
};
