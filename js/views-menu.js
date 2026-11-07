/**
 * AINA MENU — Конструктор меню на завтра + Результаты + PDF
 * Главная функция приложения.
 */

Views.menu = function() {
  const calc = Store.getCalcResults();
  const q = Store.getQuestionnaire();
  const mealCount = q?.step5?.mealCount || 4;

  const mealLabels = [
    { id: 'breakfast', label: 'Завтрак', icon: '🌅' },
    { id: 'lunch', label: 'Обед', icon: '☀️' },
    { id: 'dinner', label: 'Ужин', icon: '🌙' },
    { id: 'snack', label: 'Перекус', icon: '🍎' },
    { id: 'snack2', label: 'Перекус 2', icon: '🥜' },
    { id: 'snack3', label: 'Перекус 3', icon: '🫐' },
  ].slice(0, mealCount);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const existing = Store.getMenu(tomorrow);

  if (existing && existing.meals) {
    App.menuState = existing;
  } else {
    App.menuState = App.menuState || {
      date: tomorrow,
      phase: 'input',
      meals: mealLabels.map(m => ({ ...m, text: '', ingredients: [], servings: 1, actualWeight: null, portionGrams: null }))
    };
    // Ensure meal list matches preference
    if (App.menuState.meals.length !== mealCount) {
      App.menuState.meals = mealLabels.map(m => {
        const ex = App.menuState.meals.find(mm => mm.id === m.id);
        return ex || { ...m, text: '', ingredients: [], servings: 1, actualWeight: null, portionGrams: null };
      });
    }
  }

  if (App.menuState.phase === 'results') {
    MenuView.renderResults();
  } else {
    MenuView.renderInput();
  }
};

const MenuView = {
  renderInput() {
    const ms = App.menuState;
    let html = `
      <h1 class="page-title">Моё меню на завтра</h1>
      <p class="page-subtitle">${MenuView.fmtDate(ms.date)} — опишите, что планируете приготовить</p>`;

    if (!calc) {
      html += `<div class="alert alert-warning">⚠️ Сначала рассчитайте свою норму КБЖУ в калькуляторе. Без неё невозможно подобрать граммовки.</div>`;
    }

    if (calc) {
      html += `
        <div class="card" style="background:var(--emerald-bg)">
          <div class="flex-between">
            <span style="font-size:13px;color:var(--emerald-darker)"><strong>Ваша норма:</strong> ${calc.targetKcal} ккал · Б ${calc.macros.protein} · Ж ${calc.macros.fat} · У ${calc.macros.carbs}</span>
          </div>
        </div>`;
    }

    for (const meal of ms.meals) {
      html += `
        <div class="meal-block">
          <div class="meal-header"><span class="icon">${meal.icon}</span> ${meal.label}</div>
          <div class="meal-body">
            <textarea class="meal-input" id="meal-${meal.id}" placeholder="Опишите блюдо свободным текстом. Например: творожная лепёшка с яйцом, сыром и цельнозерновой мукой, кофе" oninput="App.menuState.meals.find(m=>m.id==='${meal.id}').text=this.value">${meal.text}</textarea>
          </div>
        </div>`;
    }

    html += `
      <div class="card">
        <div class="card-title">💧 Жидкие блюда (супы, каши на молоке)</div>
        <p class="text-sm text-muted">Если блюдо содержит воду или бульон, добавьте их после распознавания — это важно для расчёта общего выхода.</p>
      </div>
      <button class="btn btn-gold btn-block btn-lg" onclick="MenuView.calculate()">РАССЧИТАТЬ МОЁ МЕНЮ</button>
      <div class="mb-4"></div>`;

    App.render(html);
  },

  calculate() {
    const ms = App.menuState;
    let anyText = false;
    for (const meal of ms.meals) {
      if (meal.text && meal.text.trim()) {
        anyText = true;
        // Парсим текст → продукты
        const found = Calc.parseMealText(meal.text);
        // Если ингредиенты уже есть (повторный расчёт), не затираем
        if (!meal.ingredients || meal.ingredients.length === 0) {
          meal.ingredients = found.map(p => ({
            productId: p.id,
            grams: Calc.suggestGrams(p),
            method: p.methods && p.methods[0] !== '—' ? p.methods[0] : ''
          }));
        }
      }
    }
    if (!anyText) {
      App.toast('Опишите хотя бы одно блюдо');
      return;
    }
    ms.phase = 'results';
    this.renderResults();
  },

  renderResults() {
    const ms = App.menuState;
    const calc = Store.getCalcResults();
    let html = `
      <h1 class="page-title">Результаты расчёта</h1>
      <p class="page-subtitle">${MenuView.fmtDate(ms.date)} · Меню на завтра</p>`;

    if (calc) {
      html += `
        <div class="card" style="background:var(--emerald-bg);padding:12px 18px">
          <span style="font-size:13px;color:var(--emerald-darker)"><strong>Цель:</strong> ${calc.targetKcal} ккал · Б ${calc.macros.protein}г · Ж ${calc.macros.fat}г · У ${calc.macros.carbs}г</span>
        </div>`;
    }

    // Кнопки управления
    html += `
      <div class="btn-row mb-4">
        <button class="btn btn-outline btn-sm" onclick="MenuView.backToInput()">← Изменить описание</button>
        <button class="btn btn-primary btn-sm" onclick="MenuView.optimize()">Подогнать под цель</button>
      </div>`;

    const dayResults = [];
    for (const meal of ms.meals) {
      html += this.renderMeal(meal, dayResults);
    }

    // ИТОГО ЗА ДЕНЬ
    const dayTotal = Calc.dayTotal(dayResults);
    html += this.renderDayTotal(dayTotal, calc);

    // Кнопки экспорта
    html += `
      <div class="card mt-4 no-print">
        <div class="btn-row">
          <button class="btn btn-gold" onclick="MenuView.exportPDF()">📥 Скачать PDF</button>
          <button class="btn btn-outline" onclick="MenuView.print()">🖨 Печать</button>
          <button class="btn btn-outline" onclick="MenuView.copyMenu()">📋 Копировать</button>
          <button class="btn btn-outline" onclick="MenuView.shareWhatsApp()">💬 WhatsApp</button>
        </div>
        <div class="mt-4">
          <button class="btn btn-primary btn-block" onclick="MenuView.saveDay()">💾 Сохранить день</button>
        </div>
      </div>
      <div class="mb-4"></div>`;

    App.render(html);
  },

  renderMeal(meal, dayResults) {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      return `<div class="meal-block">
        <div class="meal-header"><span class="icon">${meal.icon}</span> ${meal.label}</div>
        <div class="meal-body"><p class="text-muted">Не заполнено</p></div>
      </div>`;
    }

    const ingredients = meal.ingredients.map(ing => ({
      product: getProduct(ing.productId),
      grams: ing.grams,
      method: ing.method
    })).filter(ing => ing.product);

    if (ingredients.length === 0) {
      return `<div class="meal-block">
        <div class="meal-header"><span class="icon">${meal.icon}</span> ${meal.label}</div>
        <div class="meal-body"><p class="text-muted">Продукты не распознаны</p></div>
      </div>`;
    }

    // Расчёт
    const recipe = Calc.recipeTotal(ingredients);
    let totalCooked = recipe.total.cookedWeight;
    if (meal.actualWeight) totalCooked = meal.actualWeight;

    // Порция клиентки
    const portionGrams = meal.portionGrams || Math.round(totalCooked / (meal.servings || 1));
    const portion = Calc.portionNutrition({ ...recipe.total, cookedWeight: totalCooked }, portionGrams);

    // Сохраняем для дневного итога
    dayResults.push({ portion, portionWeight: portionGrams, meal });

    let html = `
      <div class="meal-block">
        <div class="meal-header"><span class="icon">${meal.icon}</span> ${meal.label} ${meal.text ? `<span style="font-size:12px;font-weight:400;opacity:.7">— ${meal.text.slice(0, 40)}${meal.text.length > 40 ? '...' : ''}</span>` : ''}</div>
        <div class="meal-body">`;

    // Таблица ингредиентов
    html += `<div class="results-table"><table><thead><tr>
      <th>Ингредиент</th><th>Сырой/сухой</th><th>Готовый</th><th>Ккал</th><th>Б</th><th>Ж</th><th>У</th>
    </tr></thead><tbody>`;

    for (const d of recipe.details) {
      html += `<tr>
        <td>${d.product.name}<br><span class="text-muted" style="font-size:11px">${d.product.state}${d.method ? ' · ' + d.method : ''}</span></td>
        <td>${d.grams} г</td>
        <td>${d.cookedGrams} г</td>
        <td>${d.kcal}</td>
        <td>${d.protein}</td>
        <td>${d.fat}</td>
        <td>${d.carbs}</td>
      </tr>`;
    }
    html += `<tr class="total-row"><td>ИТОГО</td><td>${recipe.total.rawWeight} г</td><td>${totalCooked} г</td><td>${recipe.total.kcal}</td><td>${recipe.total.protein}</td><td>${recipe.total.fat}</td><td>${recipe.total.carbs}</td></tr>`;
    html += `</tbody></table></div>`;

    // Сводка блюда
    html += `
      <div class="summary-box mt-4">
        <h4>📊 Выход блюда и порция</h4>
        <div class="summary-row"><span>Общий выход готового блюда:</span><span class="v">${totalCooked} г ${meal.actualWeight ? '' : '<span class="orient">(ориентировочно)</span>'}</span></div>
        <div class="summary-row"><span>Количество порций:</span><span class="v">${meal.servings || 1}</span></div>
        <div class="summary-row"><span>Готовый вес порции клиентки:</span><span class="v">${portionGrams} г</span></div>
        <div class="summary-row"><span>Останется после порции:</span><span class="v">${portion.remaining} г</span></div>
      </div>
      <div class="summary-box" style="background:var(--emerald)">
        <h4>🍽 КБЖУ порции</h4>
        <div class="summary-row"><span>Калорийность порции:</span><span class="v">${portion.kcal} ккал</span></div>
        <div class="summary-row"><span>Белки:</span><span class="v">${portion.protein} г</span></div>
        <div class="summary-row"><span>Жиры:</span><span class="v">${portion.fat} г</span></div>
        <div class="summary-row"><span>Углеводы:</span><span class="v">${portion.carbs} г</span></div>
        ${portion.fiber ? `<div class="summary-row"><span>Клетчатка:</span><span class="v">${portion.fiber} г</span></div>` : ''}
      </div>`;

    // Редактирование ингредиентов
    html += `
      <div class="card-section mt-4">
        <div class="flex-between mb-2">
          <strong style="color:var(--emerald-darker)">Изменить ингредиенты</strong>
        </div>
        <div id="ing-list-${meal.id}">`;

    for (let i = 0; i < meal.ingredients.length; i++) {
      const ing = meal.ingredients[i];
      const p = getProduct(ing.productId);
      if (!p) continue;
      html += `
        <div class="ingredient-row">
          <div class="prod-select">
            <div style="font-size:13px;font-weight:600">${p.name}</div>
            <div class="text-muted text-sm">${p.state} · ${p.kcal} ккал/100г</div>
          </div>
          <input class="form-input gram-input" type="number" value="${ing.grams}" min="0" step="5"
            onchange="MenuView.updateGrams('${meal.id}', ${i}, this.value)" title="Граммы (сырой/сухой)">
          <select class="form-select" style="width:auto;font-size:12px" onchange="MenuView.updateMethod('${meal.id}', ${i}, this.value)">
            ${p.methods.map(m => `<option value="${m}" ${ing.method === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <button class="remove-btn" onclick="MenuView.removeIng('${meal.id}', ${i})" title="Удалить">✕</button>
        </div>`;
    }

    html += `</div>`;

    // Добавить продукт
    html += `
      <div class="btn-row mt-2">
        <select class="form-select" style="flex:1;font-size:13px" id="add-prod-${meal.id}">
          ${MenuView.productOptions()}
        </select>
        <button class="btn btn-outline btn-sm" onclick="MenuView.addIng('${meal.id}')">+ Добавить</button>
      </div>`;

    // Настройки порции
    html += `
      <div class="form-row mt-4">
        <div class="form-group">
          <label class="form-label">Кол-во порций</label>
          <input class="form-input" type="number" min="1" value="${meal.servings || 1}" onchange="MenuView.setServings('${meal.id}', this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Вес порции (г)</label>
          <input class="form-input" type="number" min="0" value="${portionGrams}" onchange="MenuView.setPortion('${meal.id}', this.value)">
        </div>
      </div>`;

    // Фактический вес
    html += `
      <div class="cooked-weight-input">
        <div style="flex:1">
          <label class="form-label">Я приготовила и взвесила блюдо</label>
          <input class="form-input" type="number" min="0" value="${meal.actualWeight || ''}" placeholder="Фактический готовый вес (г)" onchange="MenuView.setActual('${meal.id}', this.value)">
        </div>
        ${meal.actualWeight ? `<button class="btn btn-ghost btn-sm" onclick="MenuView.setActual('${meal.id}', '')">Сбросить</button>` : ''}
      </div>`;

    if (meal.actualWeight) {
      const per100 = Calc.recalcWithActualWeight(ingredients, meal.actualWeight).per100;
      html += `<div class="alert alert-info">КБЖУ на 100 г готового: <strong>${per100.kcal} ккал · Б ${per100.protein} · Ж ${per100.fat} · У ${per100.carbs}</strong></div>`;
    }

    // Предупреждение для неоднородных блюд
    const hasSoup = meal.text && (meal.text.toLowerCase().includes('суп') || ingredients.some(i => i.product.id === 'water'));
    if (hasSoup) {
      html += `<div class="alert alert-warning">⚠️ Неоднородное блюдо (суп): КБЖУ отдельной порции зависит от фактического распределения ингредиентов. Рекомендуется перемешать перед порционированием.</div>`;
    }

    html += `</div></div></div>`;
    return html;
  },

  renderDayTotal(dayTotal, calc) {
    let html = `
      <div class="day-total">
        <h3>ИТОГО ЗА ДЕНЬ</h3>
        <div class="summary-row"><span>Общая калорийность:</span><span class="v">${dayTotal.kcal} ккал</span></div>
        <div class="summary-row"><span>Белки:</span><span class="v">${dayTotal.protein} г</span></div>
        <div class="summary-row"><span>Жиры:</span><span class="v">${dayTotal.fat} г</span></div>
        <div class="summary-row"><span>Углеводы:</span><span class="v">${dayTotal.carbs} г</span></div>
        <div class="summary-row"><span>Клетчатка:</span><span class="v">${dayTotal.fiber} г</span></div>
        <div class="summary-row"><span>Общая масса съедаемых порций:</span><span class="v">${dayTotal.weight} г</span></div>`;

    if (calc) {
      const kcalDiff = dayTotal.kcal - calc.targetKcal;
      const kcalPct = Math.round(Math.abs(kcalDiff) / calc.targetKcal * 100);
      const pDiff = Math.round((dayTotal.protein - calc.macros.protein) * 10) / 10;
      const fDiff = Math.round((dayTotal.fat - calc.macros.fat) * 10) / 10;
      const cDiff = Math.round((dayTotal.carbs - calc.macros.carbs) * 10) / 10;
      html += `
        <div style="border-top:1px solid rgba(255,255,255,.2);margin-top:10px;padding-top:10px">
          <div class="summary-row"><span>Персональная цель (ккал):</span><span class="v">${calc.targetKcal}</span></div>
          <div class="summary-row" style="color:${kcalDiff > 0 ? '#FCD34D' : '#A7F3D0'}"><span>Отклонение от цели:</span><span class="v">${kcalDiff > 0 ? '+' : ''}${kcalDiff} ккал (${kcalPct}%)</span></div>
          <div class="summary-row"><span>Отклонение по белку:</span><span class="v">${pDiff > 0 ? '+' : ''}${pDiff} г</span></div>
          <div class="summary-row"><span>Отклонение по жирам:</span><span class="v">${fDiff > 0 ? '+' : ''}${fDiff} г</span></div>
          <div class="summary-row"><span>Отклонение по углеводам:</span><span class="v">${cDiff > 0 ? '+' : ''}${cDiff} г</span></div>
        </div>`;
    }
    html += `</div>`;
    return html;
  },

  // ── Действия ──
  updateGrams(mealId, idx, val) {
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (meal) meal.ingredients[idx].grams = Math.max(0, +val || 0);
    this.renderResults();
  },
  updateMethod(mealId, idx, val) {
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (meal) meal.ingredients[idx].method = val;
    this.renderResults();
  },
  removeIng(mealId, idx) {
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (meal) meal.ingredients.splice(idx, 1);
    this.renderResults();
  },
  addIng(mealId) {
    const sel = document.getElementById('add-prod-' + mealId);
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (!meal || !sel) return;
    const p = getProduct(sel.value);
    if (!p) return;
    meal.ingredients.push({ productId: p.id, grams: Calc.suggestGrams(p), method: p.methods[0] !== '—' ? p.methods[0] : '' });
    this.renderResults();
  },
  setServings(mealId, val) {
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (meal) {
      meal.servings = Math.max(1, +val || 1);
      // Пересчитываем порцию автоматически
      const ings = meal.ingredients.map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method }));
      const rt = Calc.recipeTotal(ings);
      const totalCooked = meal.actualWeight || rt.total.cookedWeight;
      meal.portionGrams = Math.round(totalCooked / meal.servings);
    }
    this.renderResults();
  },
  setPortion(mealId, val) {
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (meal) meal.portionGrams = Math.max(0, +val || 0);
    this.renderResults();
  },
  setActual(mealId, val) {
    const meal = App.menuState.meals.find(m => m.id === mealId);
    if (meal) {
      meal.actualWeight = val ? +val : null;
      // Пересчитываем порцию
      const ings = meal.ingredients.map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method }));
      const rt = Calc.recipeTotal(ings);
      const totalCooked = meal.actualWeight || rt.total.cookedWeight;
      meal.portionGrams = Math.round(totalCooked / (meal.servings || 1));
    }
    this.renderResults();
  },
  optimize() {
    const calc = Store.getCalcResults();
    if (!calc) { App.toast('Сначала рассчитайте норму КБЖУ'); return; }
    const meals = App.menuState.meals.map(m => ({
      ingredients: (m.ingredients || []).map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })),
      portionFraction: 1
    }));
    Calc.optimizePortions(meals, calc.targetKcal);
    // Записываем обратно
    for (let i = 0; i < App.menuState.meals.length; i++) {
      if (!meals[i].ingredients) continue;
      for (let j = 0; j < meals[i].ingredients.length; j++) {
        if (App.menuState.meals[i].ingredients[j]) {
          App.menuState.meals[i].ingredients[j].grams = meals[i].ingredients[j].grams;
        }
      }
    }
    App.toast('Граммовки скорректированы под цель');
    this.renderResults();
  },
  backToInput() {
    App.menuState.phase = 'input';
    this.renderInput();
  },

  saveDay() {
    Store.saveMenu(App.menuState.date, App.menuState);
    App.toast('Меню сохранено');
  },

  // ── Экспорт ──
  exportPDF() {
    // Открываем печатную версию
    const html = this.buildPrintHTML();
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  },
  print() {
    this.exportPDF();
  },
  copyMenu() {
    const text = this.buildShareText();
    navigator.clipboard.writeText(text).then(() => App.toast('Меню скопировано'));
  },
  shareWhatsApp() {
    const text = this.buildShareText();
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  },

  buildShareText() {
    const ms = App.menuState;
    const calc = Store.getCalcResults();
    const u = Store.currentUser();
    let text = `🍽 *AINA MENU — Меню на ${MenuView.fmtDate(ms.date)}*\n`;
    text += `👤 ${u.name}\n`;
    if (calc) text += `🎯 Цель: ${calc.targetKcal} ккал | Б ${calc.macros.protein} | Ж ${calc.macros.fat} | У ${calc.macros.carbs}\n`;
    text += `\n`;

    const dayResults = [];
    for (const meal of ms.meals) {
      if (!meal.ingredients || meal.ingredients.length === 0) continue;
      const ings = meal.ingredients.map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })).filter(i => i.product);
      if (ings.length === 0) continue;
      const rt = Calc.recipeTotal(ings);
      const totalCooked = meal.actualWeight || rt.total.cookedWeight;
      const pg = meal.portionGrams || Math.round(totalCooked / (meal.servings || 1));
      const portion = Calc.portionNutrition({ ...rt.total, cookedWeight: totalCooked }, pg);
      dayResults.push({ portion, portionWeight: pg });

      text += `*${meal.icon} ${meal.label}*\n`;
      for (const d of rt.details) {
        text += `• ${d.product.name}: ${d.grams}г (сыр.) → ${d.cookedGrams}г (готов.)\n`;
      }
      text += `Выход: ${totalCooked}г | Порция: ${pg}г\n`;
      text += `КБЖУ порции: ${portion.kcal} ккал | Б ${portion.protein} | Ж ${portion.fat} | У ${portion.carbs}\n\n`;
    }

    const dt = Calc.dayTotal(dayResults);
    text += `*ИТОГО ЗА ДЕНЬ*\n`;
    text += `Калории: ${dt.kcal} | Б ${dt.protein} | Ж ${dt.fat} | У ${dt.carbs}\n`;
    text += `Масса порций: ${dt.weight}г\n`;
    if (calc) text += `Цель: ${calc.targetKcal} ккал\n`;
    text += `\nAINA Evidence`;

    return text;
  },

  buildPrintHTML() {
    const ms = App.menuState;
    const calc = Store.getCalcResults();
    const u = Store.currentUser();
    const dayResults = [];

    let body = '';
    for (const meal of ms.meals) {
      if (!meal.ingredients || meal.ingredients.length === 0) continue;
      const ings = meal.ingredients.map(i => ({ product: getProduct(i.productId), grams: i.grams, method: i.method })).filter(i => i.product);
      if (ings.length === 0) continue;
      const rt = Calc.recipeTotal(ings);
      const totalCooked = meal.actualWeight || rt.total.cookedWeight;
      const pg = meal.portionGrams || Math.round(totalCooked / (meal.servings || 1));
      const portion = Calc.portionNutrition({ ...rt.total, cookedWeight: totalCooked }, pg);
      dayResults.push({ portion, portionWeight: pg, meal });

      body += `<div style="margin-bottom:24px;page-break-inside:avoid">
        <h3 style="color:#065F46;border-bottom:2px solid #0F766E;padding-bottom:4px">${meal.icon} ${meal.label}</h3>
        ${meal.text ? `<p style="font-size:13px;color:#666;margin-bottom:8px">${meal.text}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
          <thead><tr style="background:#F0FDFA">
            <th style="text-align:left;padding:6px 4px;border:1px solid #ddd">Ингредиент</th>
            <th style="padding:6px 4px;border:1px solid #ddd">Сырой/сухой</th>
            <th style="padding:6px 4px;border:1px solid #ddd">Готовый</th>
            <th style="padding:6px 4px;border:1px solid #ddd">Ккал</th>
            <th style="padding:6px 4px;border:1px solid #ddd">Б</th>
            <th style="padding:6px 4px;border:1px solid #ddd">Ж</th>
            <th style="padding:6px 4px;border:1px solid #ddd">У</th>
          </tr></thead><tbody>`;
      for (const d of rt.details) {
        body += `<tr>
          <td style="padding:6px 4px;border:1px solid #ddd">${d.product.name}<br><span style="font-size:10px;color:#999">${d.product.state}${d.method ? ' · ' + d.method : ''}</span></td>
          <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${d.grams} г</td>
          <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${d.cookedGrams} г</td>
          <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${d.kcal}</td>
          <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${d.protein}</td>
          <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${d.fat}</td>
          <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${d.carbs}</td>
        </tr>`;
      }
      body += `<tr style="background:#F0FDFA;font-weight:bold">
        <td style="padding:6px 4px;border:1px solid #ddd">ИТОГО</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${rt.total.rawWeight} г</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${totalCooked} г</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${rt.total.kcal}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${rt.total.protein}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${rt.total.fat}</td>
        <td style="text-align:center;padding:6px 4px;border:1px solid #ddd">${rt.total.carbs}</td>
      </tr></tbody></table>`;
      body += `<div style="background:#064E3B;color:white;padding:10px 14px;border-radius:8px;font-size:13px">
        <strong>Общий выход:</strong> ${totalCooked} г ${meal.actualWeight ? '' : '(ориентировочно)'} ·
        <strong>Порция:</strong> ${pg} г ·
        <strong>Останется:</strong> ${portion.remaining} г<br>
        <strong>КБЖУ порции:</strong> ${portion.kcal} ккал | Б ${portion.protein} | Ж ${portion.fat} | У ${portion.carbs}
      </div></div>`;
    }

    const dt = Calc.dayTotal(dayResults);
    let totalBlock = `<div style="background:linear-gradient(135deg,#0F766E 0%,#065F46 100%);color:white;padding:16px;border-radius:10px">
      <h2 style="color:#E8D5A3;font-size:18px;margin-bottom:10px">ИТОГО ЗА ДЕНЬ</h2>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.15)"><span>Калорийность:</span><strong>${dt.kcal} ккал</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.15)"><span>Белки:</span><strong>${dt.protein} г</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.15)"><span>Жиры:</span><strong>${dt.fat} г</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.15)"><span>Углеводы:</span><strong>${dt.carbs} г</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.15)"><span>Клетчатка:</span><strong>${dt.fiber} г</strong></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0"><span>Масса порций:</span><strong>${dt.weight} г</strong></div>`;
    if (calc) totalBlock += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.2)"><div style="display:flex;justify-content:space-between;font-size:14px"><span>Цель:</span><strong>${calc.targetKcal} ккал</strong></div></div>`;
    totalBlock += `</div>`;

    return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
      <title>AINA MENU — ${MenuView.fmtDate(ms.date)}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; padding:30px; color:#1F2937; }
        .pdf-header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0F766E; padding-bottom:12px; margin-bottom:20px; }
        .pdf-logo { width:44px; height:44px; border-radius:10px; background:linear-gradient(135deg,#C9A961 0%,#A88B4A 100%); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:#064E3B; }
        .pdf-brand { font-size:18px; font-weight:700; color:#065F46; }
        .pdf-sub { font-size:11px; color:#C9A961; letter-spacing:2px; text-transform:uppercase; }
        .pdf-meta { font-size:13px; color:#666; text-align:right; }
      </style></head><body>
      <div class="pdf-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="pdf-logo">A</div>
          <div><div class="pdf-brand">AINA MENU</div><div class="pdf-sub">AINA Evidence</div></div>
        </div>
        <div class="pdf-meta">
          <strong>${u.name}</strong><br>
          ${MenuView.fmtDate(ms.date)}<br>
          ${calc ? `Цель: ${calc.targetKcal} ккал | Б ${calc.macros.protein} | Ж ${calc.macros.fat} | У ${calc.macros.carbs}` : ''}
        </div>
      </div>
      ${body}
      ${totalBlock}
      <div style="margin-top:20px;font-size:11px;color:#999;text-align:center">AINA Evidence · Меню рассчитано автоматически · ${new Date().toLocaleDateString('ru-RU')}</div>
      </body></html>`;
  },

  // ── Хелперы ──
  fmtDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  },

  productOptions() {
    let html = '<option value="">— Выберите продукт —</option>';
    const cats = {};
    for (const p of PRODUCTS) {
      if (!cats[p.cat]) cats[p.cat] = [];
      cats[p.cat].push(p);
    }
    for (const [cat, prods] of Object.entries(cats)) {
      html += `<optgroup label="${PRODUCT_CATEGORIES[cat] || cat}">`;
      for (const p of prods) html += `<option value="${p.id}">${p.name} (${p.state})</option>`;
      html += `</optgroup>`;
    }
    return html;
  },
};
