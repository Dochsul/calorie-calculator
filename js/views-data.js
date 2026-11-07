/**
 * AINA MENU — История, измерения, рецепты, кабинет специалиста
 */

// ── История меню (календарь) ──
Views.history = function() {
  const menus = Store.getAllMenus();
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth(), 1);

  const render = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const firstDay = new Date(y, m, 1).getDay() || 7; // Mon=1
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayStr = today.toISOString().slice(0, 10);

    let cells = '';
    for (let i = 1; i < firstDay; i++) cells += '<div class="calendar-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasMenu = !!menus[ds];
      const isToday = ds === todayStr;
      cells += `<div class="calendar-day ${hasMenu ? 'has-menu' : ''} ${isToday ? 'today' : ''}" onclick="window._histPick('${ds}')">${d}</div>`;
    }

    let html = `
      <h1 class="page-title">История меню</h1>
      <p class="page-subtitle">Календарь сохранённых меню</p>
      <div class="card">
        <div class="calendar-header">
          <button class="btn btn-ghost btn-sm" onclick="window._histPrev()" style="float:left">←</button>
          ${months[m]} ${y}
          <button class="btn btn-ghost btn-sm" onclick="window._histNext()" style="float:right">→</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;font-size:11px;color:var(--gray-400);text-align:center">
          <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
        </div>
        <div class="calendar-grid">${cells}</div>
        <div class="text-sm text-muted mt-2">
          <span style="display:inline-block;width:12px;height:12px;background:var(--emerald);border-radius:3px;vertical-align:middle"></span> — есть сохранённое меню
          &nbsp;<span style="display:inline-block;width:12px;height:12px;border:2px solid var(--gold);border-radius:3px;vertical-align:middle"></span> — сегодня
        </div>
      </div>
      <div id="hist-detail"></div>
      <button class="btn btn-outline btn-block mb-4" onclick="App.navigate('/menu')">🍽 Составить новое меню</button>`;

    App.render(html);
  };

  window._histPrev = () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); };
  window._histNext = () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); };
  window._histPick = (ds) => {
    const menu = menus[ds];
    const el = document.getElementById('hist-detail');
    if (!menu) { el.innerHTML = '<div class="empty-state"><p>Меню на эту дату не сохранено</p></div>'; return; }
    let html = `<div class="card"><div class="card-title">📋 Меню от ${MenuView.fmtDate(ds)}</div>`;
    for (const meal of (menu.meals || [])) {
      html += `<div style="margin-bottom:12px"><strong>${meal.icon} ${meal.label}</strong>`;
      if (meal.text) html += `<div class="text-sm text-muted">${meal.text}</div>`;
      if (meal.ingredients && meal.ingredients.length) {
        const ings = meal.ingredients.map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })).filter(i => i.product);
        const rt = Calc.recipeTotal(ings);
        const totalCooked = meal.actualWeight || rt.total.cookedWeight;
        const pg = meal.portionGrams || Math.round(totalCooked / (meal.servings || 1));
        const portion = Calc.portionNutrition({ ...rt.total, cookedWeight: totalCooked }, pg);
        html += `<div class="text-sm">Порция: ${pg}г · ${portion.kcal} ккал · Б ${portion.protein} · Ж ${portion.fat} · У ${portion.carbs}</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
  };

  render();
};

// ── Измерения ──
Views.measurements = function() {
  const measurements = Store.getMeasurements();
  const q = Store.getQuestionnaire();
  const s1 = q?.step1 || {};

  const render = () => {
    let html = `
      <h1 class="page-title">Мои измерения</h1>
      <p class="page-subtitle">История веса и окружностей</p>

      <div class="card">
        <div class="card-title">➕ Новое измерение</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Дата</label><input class="form-input" type="date" id="m-date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label class="form-label">Вес (кг)</label><input class="form-input" type="number" step="0.1" id="m-weight" placeholder="65.5" min="20" max="300"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Талия (см)</label><input class="form-input" type="number" id="m-waist" placeholder="80"></div>
          <div class="form-group"><label class="form-label">Живот (см)</label><input class="form-input" type="number" id="m-belly" placeholder="85"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Бёдра (см)</label><input class="form-input" type="number" id="m-hips" placeholder="100"></div>
          <div class="form-group"><label class="form-label">Грудь (см)</label><input class="form-input" type="number" id="m-chest" placeholder=""></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="window._mAdd()">Добавить измерение</button>
      </div>`;

    // График веса
    if (measurements.length > 0) {
      html += `<div class="card"><div class="card-title">📈 График веса</div>${renderWeightChart(measurements, s1.targetWeight)}</div>`;
      // Текущие показатели
      const last = measurements[measurements.length - 1];
      const first = measurements[0];
      html += `<div class="card"><div class="card-title">📊 Текущие показатели</div>`;
      html += `<div class="measurement-list">`;
      html += `<div class="measurement-item"><span>Текущий вес</span><span class="vals">${last.weight || '—'} кг</span></div>`;
      if (s1.targetWeight) {
        const diff = (last.weight - s1.targetWeight).toFixed(1);
        html += `<div class="measurement-item"><span>Цель</span><span class="vals">${s1.targetWeight} кг (${diff > 0 ? 'осталось ' : 'достигнуто +'}${Math.abs(diff)} кг)</span></div>`;
      }
      if (first.weight && last.weight) {
        const totalDiff = (last.weight - first.weight).toFixed(1);
        html += `<div class="measurement-item"><span>Изменение с начала</span><span class="vals">${totalDiff > 0 ? '+' : ''}${totalDiff} кг</span></div>`;
      }
      if (last.waist) html += `<div class="measurement-item"><span>Талия</span><span class="vals">${last.waist} см</span></div>`;
      if (last.belly) html += `<div class="measurement-item"><span>Живот</span><span class="vals">${last.belly} см</span></div>`;
      if (last.hips) html += `<div class="measurement-item"><span>Бёдра</span><span class="vals">${last.hips} см</span></div>`;
      html += `</div></div>`;

      // История
      html += `<div class="card"><div class="card-title">📋 История измерений</div><div class="measurement-list">`;
      for (let i = measurements.length - 1; i >= 0; i--) {
        const m = measurements[i];
        const vals = [m.weight && `${m.weight} кг`, m.waist && `Т:${m.waist}`, m.belly && `Ж:${m.belly}`, m.hips && `Б:${m.hips}`].filter(Boolean).join(' · ');
        html += `<div class="measurement-item"><span class="date">${m.date}</span><span class="vals">${vals}</span></div>`;
      }
      html += `</div></div>`;

      // Предложение обновить расчёт
      if (s1.weight && last.weight && Math.abs(last.weight - s1.weight) > 1) {
        html += `<div class="alert alert-info">Ваш вес изменился. <button class="btn btn-ghost btn-sm" onclick="App.navigate('/calculator')">Обновить расчёт КБЖУ →</button></div>`;
      }
    } else {
      html += `<div class="empty-state"><p>Нет сохранённых измерений. Добавьте первое выше.</p></div>`;
    }

    App.render(html);
  };

  window._mAdd = () => {
    const m = {
      date: document.getElementById('m-date').value,
      weight: +document.getElementById('m-weight').value || undefined,
      waist: +document.getElementById('m-waist').value || undefined,
      belly: +document.getElementById('m-belly').value || undefined,
      hips: +document.getElementById('m-hips').value || undefined,
      chest: +document.getElementById('m-chest').value || undefined,
    };
    if (!m.weight && !m.waist && !m.belly && !m.hips) { App.toast('Заполните хотя бы одно поле'); return; }
    Store.addMeasurement(m);
    App.toast('Измерение добавлено');
    render();
  };

  render();
};

function renderWeightChart(measurements, targetWeight) {
  const withWeight = measurements.filter(m => m.weight);
  if (withWeight.length < 1) return '<p class="text-muted">Недостаточно данных для графика</p>';

  const weights = withWeight.map(m => m.weight);
  const minW = Math.min(...weights, targetWeight || Infinity) - 1;
  const maxW = Math.max(...weights, targetWeight || 0) + 1;
  const range = maxW - minW || 1;

  const w = 280, h = 160, pad = 30;
  const xStep = (w - pad * 2) / Math.max(1, withWeight.length - 1);

  let points = '';
  let dots = '';
  withWeight.forEach((m, i) => {
    const x = pad + i * xStep;
    const y = h - pad - ((m.weight - minW) / range) * (h - pad * 2);
    points += `${x},${y} `;
    dots += `<circle cx="${x}" cy="${y}" r="3" fill="#0F766E"/>`;
  });

  let targetLine = '';
  if (targetWeight) {
    const ty = h - pad - ((targetWeight - minW) / range) * (h - pad * 2);
    targetLine = `<line x1="${pad}" y1="${ty}" x2="${w - pad}" y2="${ty}" stroke="#C9A961" stroke-dasharray="4,4" stroke-width="1.5"/><text x="${w - pad}" y="${ty - 4}" font-size="10" fill="#C9A961">цель ${targetWeight}</text>`;
  }

  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="#0F766E" stroke-width="2"/>
    ${dots}
    ${targetLine}
    <text x="${pad}" y="${h - 8}" font-size="10" fill="#999">${withWeight[0].date}</text>
    <text x="${w - pad - 40}" y="${h - 8}" font-size="10" fill="#999">${withWeight[withWeight.length - 1].date}</text>
  </svg>`;
}

// ── Рецепты ──
Views.recipes = function() {
  const recipes = Store.getRecipes();

  const render = () => {
    let html = `
      <h1 class="page-title">Мои рецепты</h1>
      <p class="page-subtitle">Сохранённые домашние рецепты</p>`;

    if (recipes.length > 0) {
      for (const r of recipes) {
        const ings = (r.ingredients || []).map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })).filter(i => i.product);
        const rt = Calc.recipeTotal(ings);
        html += `
          <div class="recipe-card">
            <h4>${r.name}</h4>
            <div class="recipe-meta">
              <span>⏱ ${r.cookTime || '—'} мин</span>
              <span>🍲 ${rt.total.cookedWeight} г</span>
              <span>🔥 ${rt.total.kcal} ккал</span>
              <span>🍽 ${r.servings || 1} порц.</span>
            </div>
            <div class="text-sm mt-2">${r.ingredients?.map(i => { const p = getProduct(i.productId); return p ? p.name : '?'; }).join(', ') || ''}</div>
            <div class="btn-row mt-2">
              <button class="btn btn-ghost btn-sm" onclick="window._recView('${r.id}')">Подробнее</button>
              <button class="btn btn-ghost btn-sm" onclick="window._recDelete('${r.id}')" style="color:var(--red)">Удалить</button>
            </div>
          </div>`;
      }
    } else {
      html += `<div class="empty-state"><p>Нет сохранённых рецептов. Создайте первый!</p></div>`;
    }

    // Форма создания
    html += `
      <div class="card">
        <div class="card-title">➕ Новый рецепт</div>
        <div class="form-group"><label class="form-label">Название</label><input class="form-input" id="rec-name" placeholder="Куриный суп"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Время (мин)</label><input class="form-input" type="number" id="rec-time" placeholder="30"></div>
          <div class="form-group"><label class="form-label">Порций</label><input class="form-input" type="number" id="rec-servings" value="1" min="1"></div>
        </div>
        <div class="form-group"><label class="form-label">Способ приготовления</label><textarea class="form-textarea" id="rec-method" placeholder="Опишите шаги приготовления..."></textarea></div>
        <div class="form-group">
          <label class="form-label">Ингредиенты</label>
          <div id="rec-ings"></div>
          <div class="btn-row mt-2">
            <select class="form-select" style="flex:1;font-size:13px" id="rec-add-prod">${MenuView.productOptions()}</select>
            <input class="form-input" type="number" id="rec-add-grams" placeholder="г" style="width:70px">
            <button class="btn btn-outline btn-sm" onclick="window._recAddIng()">+</button>
          </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="window._recSave()">Сохранить рецепт</button>
      </div>
      <div class="mb-4"></div>`;

    App.render(html);
    window._recIngList = [];
    window._recRenderIngs();
  };

  window._recAddIng = () => {
    const prodId = document.getElementById('rec-add-prod').value;
    const grams = +document.getElementById('rec-add-grams').value;
    if (!prodId || !grams) { App.toast('Выберите продукт и граммы'); return; }
    window._recIngList.push({ productId: prodId, grams, method: getProduct(prodId).methods[0] !== '—' ? getProduct(prodId).methods[0] : '' });
    document.getElementById('rec-add-grams').value = '';
    window._recRenderIngs();
  };
  window._recRenderIngs = () => {
    const el = document.getElementById('rec-ings');
    if (!el) return;
    el.innerHTML = window._recIngList.map((ing, i) => {
      const p = getProduct(ing.productId);
      return `<div class="ingredient-row">
        <div class="prod-select"><div style="font-size:13px;font-weight:600">${p.name}</div><div class="text-muted text-sm">${p.state} · ${p.kcal} ккал/100г</div></div>
        <div style="font-size:13px;font-weight:600">${ing.grams} г</div>
        <button class="remove-btn" onclick="window._recIngList.splice(${i},1);window._recRenderIngs()">✕</button>
      </div>`;
    }).join('');
  };
  window._recSave = () => {
    const recipe = {
      name: document.getElementById('rec-name').value,
      cookTime: +document.getElementById('rec-time').value || null,
      servings: +document.getElementById('rec-servings').value || 1,
      method: document.getElementById('rec-method').value,
      ingredients: window._recIngList
    };
    if (!recipe.name || recipe.ingredients.length === 0) { App.toast('Укажите название и ингредиенты'); return; }
    Store.saveRecipe(recipe);
    App.toast('Рецепт сохранён');
    render();
  };
  window._recDelete = (id) => {
    if (confirm('Удалить рецепт?')) { Store.deleteRecipe(id); render(); }
  };
  window._recView = (id) => {
    const r = recipes.find(rr => rr.id === id);
    if (!r) return;
    const ings = (r.ingredients || []).map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })).filter(i => i.product);
    const rt = Calc.recipeTotal(ings);
    let detail = `<div class="card"><div class="card-title">📖 ${r.name}</div>`;
    detail += `<div class="recipe-meta mb-2"><span>⏱ ${r.cookTime || '—'} мин</span><span>🍽 ${r.servings} порц.</span><span>🍲 ${rt.total.cookedWeight} г</span></div>`;
    detail += `<div class="results-table"><table><thead><tr><th>Ингредиент</th><th>Сырой/сухой</th><th>Готовый</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th></tr></thead><tbody>`;
    for (const d of rt.details) {
      detail += `<tr><td>${d.product.name}</td><td>${d.grams} г</td><td>${d.cookedGrams} г</td><td>${d.kcal}</td><td>${d.protein}</td><td>${d.fat}</td><td>${d.carbs}</td></tr>`;
    }
    detail += `<tr class="total-row"><td>ИТОГО</td><td>${rt.total.rawWeight} г</td><td>${rt.total.cookedWeight} г</td><td>${rt.total.kcal}</td><td>${rt.total.protein}</td><td>${rt.total.fat}</td><td>${rt.total.carbs}</td></tr>`;
    detail += `</tbody></table></div>`;
    if (r.method) detail += `<div class="mt-2"><strong>Способ приготовления:</strong><p class="text-sm mt-1">${r.method}</p></div>`;
    const pg = Math.round(rt.total.cookedWeight / r.servings);
    const portion = Calc.portionNutrition(rt.total, pg);
    detail += `<div class="summary-box mt-2"><h4>Порция (${pg} г)</h4><div class="summary-row"><span>КБЖУ:</span><span class="v">${portion.kcal} ккал · Б ${portion.protein} · Ж ${portion.fat} · У ${portion.carbs}</span></div></div>`;
    detail += `</div>`;
    App.toast(r.name);
    // Показываем как модалку-сообщение
    alert(detail.replace(/<[^>]*>/g, '\n').replace(/\n{3,}/g, '\n\n').trim());
  };

  render();
};

// ── Кабинет специалиста ──
Views.specialist = function() {
  if (!Store.isSpecialist()) {
    App.render(`<div class="alert alert-danger">Доступ только для специалистов AINA Evidence.</div>`);
    return;
  }

  const clients = Store.getClients();
  let selectedClient = null;

  const render = () => {
    let html = `
      <h1 class="page-title">Кабинет специалиста</h1>
      <p class="page-subtitle">AINA Evidence — просмотр анкет и меню клиенток</p>`;

    if (!selectedClient) {
      if (clients.length === 0) {
        html += `<div class="empty-state"><p>Нет клиенток, предоставивших доступ. Клиентки могут предоставить доступ в настройках.</p></div>`;
      } else {
        html += `<div class="client-list">`;
        for (const c of clients) {
          const q = c.questionnaire;
          const calc = c.calcResults;
          html += `<div class="client-card" onclick="window._specSelect('${c.email}')">
            <h4>${c.name}</h4>
            <div class="meta">${c.email}${q ? ' · Анкета заполнена' : ' · Анкета не заполнена'}${calc ? ' · Расчёт: ' + calc.targetKcal + ' ккал' : ''}</div>
          </div>`;
        }
        html += `</div>`;
      }
    } else {
      const c = Store.getClient(selectedClient);
      if (!c) { selectedClient = null; render(); return; }
      const q = c.questionnaire;
      const calc = c.calcResults;
      html += `<button class="btn btn-ghost btn-sm mb-2" onclick="window._specSelect(null)">← К списку клиенток</button>`;
      html += `<h2 style="color:var(--emerald-darker);margin-bottom:12px">${c.name}</h2>`;

      // Анкета
      if (q) {
        const s1 = q.step1 || {};
        html += `<div class="card"><div class="card-title">📋 Анкета</div>`;
        html += `<div style="font-size:14px;line-height:1.8">
          <div><strong>Возраст:</strong> ${s1.age || '—'} · <strong>Пол:</strong> ${s1.gender === 'male' ? 'Муж' : 'Жен'}</div>
          <div><strong>Рост:</strong> ${s1.height || '—'} см · <strong>Вес:</strong> ${s1.weight || '—'} кг</div>`;
        if (s1.waist) html += `<div><strong>Талия:</strong> ${s1.waist} см · <strong>Бёдра:</strong> ${s1.hips || '—'} см</div>`;
        if (s1.targetWeight) html += `<div><strong>Целевой вес:</strong> ${s1.targetWeight} кг</div>`;
        const s2 = q.step2 || {};
        if (s2.goals && s2.goals.length) html += `<div><strong>Цели:</strong> ${s2.goals.join(', ')}</div>`;
        const s3 = q.step3 || {};
        if (s3.conditions && s3.conditions.length) html += `<div><strong>Заболевания:</strong> ${s3.conditions.join(', ')}</div>`;
        if (s3.allergies) html += `<div><strong>Аллергии:</strong> ${s3.allergies}</div>`;
        if (s3.meds) html += `<div><strong>Лекарства:</strong> ${s3.meds}</div>`;
        html += `</div></div>`;
      }

      // Расчёт
      if (calc) {
        html += `<div class="card">
          <div class="card-title">📊 Расчёт КБЖУ</div>
          <div class="result-grid">
            <div class="result-tile"><div class="label">Калории</div><div class="value">${calc.targetKcal}</div><div class="unit">ккал/день</div></div>
            <div class="result-tile"><div class="label">Белки</div><div class="value">${calc.macros.protein}</div><div class="unit">г</div></div>
            <div class="result-tile"><div class="label">Жиры</div><div class="value">${calc.macros.fat}</div><div class="unit">г</div></div>
            <div class="result-tile"><div class="label">Углеводы</div><div class="value">${calc.macros.carbs}</div><div class="unit">г</div></div>
          </div>
          <div class="form-group">
            <label class="form-label">Корректировка калорийности (специалист)</label>
            <div class="btn-row">
              <input class="form-input" type="number" id="spec-adjust-kcal" value="${calc.targetKcal}" style="flex:1">
              <button class="btn btn-primary btn-sm" onclick="window._specAdjust('${c.email}', document.getElementById('spec-adjust-kcal').value)">Применить</button>
            </div>
          </div>
        </div>`;
      }

      // Меню
      const menus = c.menus || {};
      const menuDates = Object.keys(menus).sort().reverse();
      if (menuDates.length > 0) {
        html += `<div class="card"><div class="card-title">📅 Меню клиентки</div>`;
        for (const ds of menuDates.slice(0, 10)) {
          const menu = menus[ds];
          const approved = Store.isMenuApproved(c.email, ds);
          html += `<div style="border:1px solid var(--gray-200);border-radius:8px;padding:12px;margin-bottom:10px">
            <div class="flex-between mb-2">
              <strong>${MenuView.fmtDate(ds)}</strong>
              <span class="badge ${approved ? 'badge-approved' : 'badge-auto'}">${approved ? '✓ Проверено специалистом' : 'Меню рассчитано автоматически'}</span>
            </div>`;
          for (const meal of (menu.meals || [])) {
            if (!meal.ingredients || !meal.ingredients.length) continue;
            const ings = meal.ingredients.map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })).filter(i => i.product);
            const rt = Calc.recipeTotal(ings);
            const totalCooked = meal.actualWeight || rt.total.cookedWeight;
            const pg = meal.portionGrams || Math.round(totalCooked / (meal.servings || 1));
            const portion = Calc.portionNutrition({ ...rt.total, cookedWeight: totalCooked }, pg);
            html += `<div class="text-sm" style="margin-bottom:4px"><strong>${meal.label}:</strong> ${meal.text || ''} — ${pg}г, ${portion.kcal} ккал</div>`;
          }
          if (!approved) {
            html += `<button class="btn btn-gold btn-sm mt-2" onclick="window._specApprove('${c.email}', '${ds}')">Утвердить меню</button>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      } else {
        html += `<div class="empty-state"><p>Клиентка ещё не сохранила ни одного меню</p></div>`;
      }

      // Измерения
      const measurements = c.measurements || [];
      if (measurements.length > 0) {
        html += `<div class="card"><div class="card-title">📏 Измерения</div>`;
        for (let i = measurements.length - 1; i >= 0; i--) {
          const m = measurements[i];
          const vals = [m.weight && `${m.weight} кг`, m.waist && `Т:${m.waist}`, m.belly && `Ж:${m.belly}`, m.hips && `Б:${m.hips}`].filter(Boolean).join(' · ');
          html += `<div class="measurement-item"><span class="date">${m.date}</span><span class="vals">${vals}</span></div>`;
        }
        html += `</div>`;
      }
    }

    App.render(html);
  };

  window._specSelect = (email) => { selectedClient = email; render(); };
  window._specApprove = (email, date) => {
    Store.approveMenu(email, date);
    App.toast('Меню проверено специалистом AINA Evidence');
    render();
  };
  window._specAdjust = (email, kcal) => {
    const c = Store.getClient(email);
    if (!c || !c.calcResults) return;
    c.calcResults.customKcal = +kcal;
    c.calcResults.targetKcal = +kcal;
    Store._save();
    App.toast('Калорийность скорректирована');
    render();
  };

  render();
};
