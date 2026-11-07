/**
 * AINA MENU — Аутентификация и анкета
 */

Views.auth = function() {
  const root = document.querySelector('#auth-root') || document.querySelector('#app');
  let mode = 'login';
  let role = 'client';

  const renderAuth = () => {
    root.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-logo">
            <div class="brand-logo">A</div>
            <h1>AINA MENU</h1>
            <p>AINA Evidence</p>
          </div>
          <div class="auth-tabs">
            <div class="auth-tab ${mode === 'login' ? 'active' : ''}" onclick="window._authMode='login';window._authRender()">Вход</div>
            <div class="auth-tab ${mode === 'register' ? 'active' : ''}" onclick="window._authMode='register';window._authRender()">Регистрация</div>
          </div>
          <div class="auth-notice">
            <strong>Локальный прототип.</strong> Данные хранятся в браузере. Это не облачный сервис. Для реальной работы требуется защищённый backend (Supabase и др.).
          </div>
          <form id="auth-form" onsubmit="return window._authSubmit(event)">
            ${mode === 'register' ? `
              <div class="form-group">
                <label class="form-label">Имя</label>
                <input class="form-input" id="auth-name" required placeholder="Ваше имя">
              </div>
              <div class="form-group">
                <label class="form-label">Роль</label>
                <div class="radio-group">
                  <label class="radio-card ${role === 'client' ? 'selected' : ''}" onclick="window._authSetRole('client',this)">
                    <input type="radio" name="role" value="client" ${role === 'client' ? 'checked' : ''}>
                    <div><div class="radio-card-title">Клиент</div><div class="radio-card-desc">Заполняю анкету и составляю меню</div></div>
                  </label>
                  <label class="radio-card ${role === 'specialist' ? 'selected' : ''}" onclick="window._authSetRole('specialist',this)">
                    <input type="radio" name="role" value="specialist" ${role === 'specialist' ? 'checked' : ''}>
                    <div><div class="radio-card-title">Специалист AINA Evidence</div><div class="radio-card-desc">Проверяю анкеты и утверждаю меню</div></div>
                  </label>
                </div>
              </div>
            ` : ''}
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" id="auth-email" required placeholder="example@mail.ru">
            </div>
            <div class="form-group">
              <label class="form-label">Пароль</label>
              <input class="form-input" type="password" id="auth-password" required placeholder="••••••••">
            </div>
            <div id="auth-error" class="form-error hidden"></div>
            <button type="submit" class="btn btn-primary btn-block btn-lg">${mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
          </form>
        </div>
      </div>`;
  };

  window._authMode = mode;
  window._authRole = role;
  window._authRender = () => {
    mode = window._authMode || 'login';
    role = window._authRole || 'client';
    renderAuth();
  };
  window._authSetRole = (r, el) => {
    role = r;
    window._authRole = r;
    el.parentElement.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    el.querySelector('input[type="radio"]').checked = true;
  };
  window._authSubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = mode === 'register' ? document.getElementById('auth-name').value : '';
    const errEl = document.getElementById('auth-error');

    let result;
    if (mode === 'register') result = Store.register(email, password, name, role);
    else result = Store.login(email, password);

    if (!result.ok) {
      errEl.textContent = result.error;
      errEl.classList.remove('hidden');
    } else {
      App.router();
    }
    return false;
  };

  renderAuth();
};

// ── Анкета (многошаговая) ──
Views.questionnaire = function() {
  let step = 0;
  const totalSteps = 6;
  const data = Store.getQuestionnaire() || {};

  const steps = [
    // Шаг 1: Основные сведения
    () => {
      const d = data.step1 || {};
      return `
        <div class="step-title">Основные сведения</div>
        <div class="step-desc">Расскажите о себе — это нужно для точного расчёта</div>
        <div class="form-group"><label class="form-label">Имя</label><input class="form-input" id="q-name" value="${d.name || ''}" placeholder="Как вас зовут?"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Дата рождения</label><input class="form-input" type="date" id="q-birthdate" value="${d.birthdate || ''}"></div>
          <div class="form-group"><label class="form-label">Возраст (лет)</label><input class="form-input" type="number" id="q-age" value="${d.age || ''}" min="1" max="120"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Пол (для расчётной формулы)</label>
          <div class="radio-group">
            <label class="radio-card ${d.gender === 'female' ? 'selected' : ''}" onclick="this.parentElement.querySelectorAll('.radio-card').forEach(r=>r.classList.remove('selected'));this.classList.add('selected');document.getElementById('q-gender').value='female'">
              <input type="radio" name="gender" value="female" ${d.gender === 'female' ? 'checked' : ''}>
              <div class="radio-card-title">Женский</div>
            </label>
            <label class="radio-card ${d.gender === 'male' ? 'selected' : ''}" onclick="this.parentElement.querySelectorAll('.radio-card').forEach(r=>r.classList.remove('selected'));this.classList.add('selected');document.getElementById('q-gender').value='male'">
              <input type="radio" name="gender" value="male" ${d.gender === 'male' ? 'checked' : ''}>
              <div class="radio-card-title">Мужской</div>
            </label>
          </div>
          <input type="hidden" id="q-gender" value="${d.gender || ''}">
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Рост (см)</label><input class="form-input" type="number" id="q-height" value="${d.height || ''}" min="80" max="250"></div>
          <div class="form-group"><label class="form-label">Текущий вес (кг)</label><input class="form-input" type="number" step="0.1" id="q-weight" value="${d.weight || ''}" min="20" max="300"></div>
        </div>
        <div class="form-group"><label class="form-label">Дата измерения веса</label><input class="form-input" type="date" id="q-weightDate" value="${d.weightDate || new Date().toISOString().slice(0,10)}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Желаемый вес (кг)</label><input class="form-input" type="number" step="0.1" id="q-targetWeight" value="${d.targetWeight || ''}" min="20" max="300"></div>
          <div class="form-group"><label class="form-label">Макс. вес (кг)</label><input class="form-input" type="number" step="0.1" id="q-maxWeight" value="${d.maxWeight || ''}" min="20" max="300"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Мин. вес во взрослом возрасте (кг)</label><input class="form-input" type="number" step="0.1" id="q-minWeight" value="${d.minWeight || ''}" min="20" max="300"></div>
          <div class="form-group"><label class="form-label">Окр. талии (см)</label><input class="form-input" type="number" id="q-waist" value="${d.waist || ''}" min="40" max="200"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Окр. живота на уровне пупка (см)</label><input class="form-input" type="number" id="q-belly" value="${d.belly || ''}" min="40" max="200"></div>
          <div class="form-group"><label class="form-label">Окр. бёдер (см)</label><input class="form-input" type="number" id="q-hips" value="${d.hips || ''}" min="40" max="200"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Окр. груди (см) — необязательно</label><input class="form-input" type="number" id="q-chest" value="${d.chest || ''}" min="40" max="200"></div>
          <div class="form-group"><label class="form-label">Окр. руки (см) — необязательно</label><input class="form-input" type="number" id="q-arm" value="${d.arm || ''}" min="10" max="80"></div>
        </div>
        ${Views._calcPreview(d)}
      `;
    },

    // Шаг 2: Цели питания
    () => {
      const d = data.step2 || {};
      const goals = [
        { id: 'lose', label: 'Снижение веса' }, { id: 'maintain', label: 'Поддержание веса' },
        { id: 'gain', label: 'Набор массы' }, { id: 'waist', label: 'Снижение окружности талии' },
        { id: 'fat', label: 'Уменьшение доли жировой массы' }, { id: 'muscle', label: 'Сохранение мышечной массы' },
        { id: 'appetite', label: 'Улучшение контроля аппетита' }, { id: 'habits', label: 'Улучшение пищевых привычек' },
      ];
      const sel = d.goals || [];
      return `
        <div class="step-title">Цели питания</div>
        <div class="step-desc">Что вы хотите достичь? Выберите все подходящие варианты</div>
        <div class="form-group">
          <label class="form-label">Цели (можно несколько)</label>
          <div class="chip-group" id="goal-chips">
            ${goals.map(g => `<div class="chip ${sel.includes(g.id) ? 'selected' : ''}" data-val="${g.id}" onclick="this.classList.toggle('selected')">${g.label}</div>`).join('')}
          </div>
        </div>
        <div class="form-group"><label class="form-label">Причина изменения веса</label><textarea class="form-textarea" id="q-reason" placeholder="Например: здоровье, эстетика, рекомендации врача...">${d.reason || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Предыдущие попытки похудения</label><textarea class="form-textarea" id="q-prevAttempts" placeholder="Что пробовали, какие результаты...">${d.prevAttempts || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Трудности удержания результата</label><textarea class="form-textarea" id="q-difficulties" placeholder="Срывы, возвращение веса, эмоциональное переедание...">${d.difficulties || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Ожидаемый результат</label><textarea class="form-textarea" id="q-expectations" placeholder="Какой результат вы ожидаете?">${d.expectations || ''}</textarea></div>
      `;
    },

    // Шаг 3: Состояние здоровья
    () => {
      const d = data.step3 || {};
      const conditions = [
        { id: 'diabetes', label: 'Сахарный диабет' }, { id: 'liver', label: 'Заболевания печени' },
        { id: 'gallbladder', label: 'Заболевания желчного пузыря' }, { id: 'anemia', label: 'Анемия / дефицит железа' },
        { id: 'thyroid', label: 'Эндокринные заболевания' }, { id: 'gi', label: 'Заболевания ЖКТ' },
        { id: 'constipation', label: 'Запоры, вздутие, боли в животе' }, { id: 'allergy', label: 'Пищевые аллергии и непереносимости' },
        { id: 'pregnancy', label: 'Беременность / грудное вскармливание' }, { id: 'hypertension', label: 'Повышенное артериальное давление' },
      ];
      const sel = d.conditions || [];
      return `
        <div class="step-title">Состояние здоровья</div>
        <div class="step-desc">Эта информация поможет специалисту учесть ваши особенности</div>
        <div class="form-group">
          <label class="form-label">Диагностированные заболевания</label>
          <div class="chip-group" id="cond-chips">
            ${conditions.map(c => `<div class="chip ${sel.includes(c.id) ? 'selected' : ''}" data-val="${c.id}" onclick="this.classList.toggle('selected')">${c.label}</div>`).join('')}
          </div>
        </div>
        <div class="form-group"><label class="form-label">Пищевые аллергии и непереносимости (укажите конкретно)</label><textarea class="form-textarea" id="q-allergies" placeholder="Например: непереносимость лактозы, аллергия на орехи...">${d.allergies || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Принимаемые лекарства</label><textarea class="form-textarea" id="q-meds" placeholder="Перечислите препараты...">${d.meds || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Пищевые добавки</label><textarea class="form-textarea" id="q-supplements" placeholder="Витамины, БАДы...">${d.supplements || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Медицинские ограничения питания</label><textarea class="form-textarea" id="q-restrictions" placeholder="Что нельзя есть по медицинским показаниям...">${d.restrictions || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Жалобы и подробное описание</label><textarea class="form-textarea" id="q-complaints" placeholder="Опишите своё самочувствие подробно...">${d.complaints || ''}</textarea></div>
        <div class="alert alert-warning">⚠️ Если у вас есть хронические заболевания, <strong>необходима проверка специалистом</strong> перед началом изменения питания. Приложение не ставит диагнозы и не назначает лечебное питание.</div>
      `;
    },

    // Шаг 4: Пищевое поведение
    () => {
      const d = data.step4 || {};
      const sliders = [
        { id: 'appetite', label: 'Выраженность аппетита', val: d.appetite ?? 5 },
        { id: 'stress', label: 'Уровень стресса', val: d.stress ?? 5 },
        { id: 'craving', label: 'Тяга к сладкому', val: d.craving ?? 5 },
        { id: 'readiness', label: 'Готовность менять питание', val: d.readiness ?? 7 },
      ];
      const flags = [
        { id: 'emotional', label: 'Эмоциональное переедание' }, { id: 'night', label: 'Ночные приёмы пищи' },
        { id: 'snacking', label: 'Частые перекусы' }, { id: 'lossControl', label: 'Эпизоды потери контроля над едой' },
        { id: 'history', label: 'История расстройств пищевого поведения' },
      ];
      const sel = d.flags || [];
      return `
        <div class="step-title">Пищевое поведение</div>
        <div class="step-desc">Оцените по шкале от 0 до 10</div>
        ${sliders.map(s => `
          <div class="slider-group">
            <div class="slider-label"><span>${s.label}</span><span class="val" id="val-${s.id}">${s.val}</span></div>
            <input type="range" min="0" max="10" value="${s.val}" id="q-${s.id}" oninput="document.getElementById('val-${s.id}').textContent=this.value">
          </div>
        `).join('')}
        <div class="form-group mt-4">
          <label class="form-label">Дополнительные факторы</label>
          <div class="chip-group">
            ${flags.map(f => `<div class="chip ${sel.includes(f.id) ? 'selected' : ''}" data-val="${f.id}" onclick="this.classList.toggle('selected')">${f.label}</div>`).join('')}
          </div>
        </div>
        <div class="form-group"><label class="form-label">Чувство голода и насыщения</label><textarea class="form-textarea" id="q-hungerSatiety" placeholder="Как вы чувствуете голод и сытость?">${d.hungerSatiety || ''}</textarea></div>
      `;
    },

    // Шаг 5: Пищевые предпочтения
    () => {
      const d = data.step5 || {};
      return `
        <div class="step-title">Пищевые предпочтения</div>
        <div class="step-desc">Расскажите, что вы любите и что нет</div>
        <div class="form-group"><label class="form-label">Любимые продукты</label><textarea class="form-textarea" id="q-love" placeholder="Перечислите любимые продукты...">${d.love || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Нелюбимые продукты</label><textarea class="form-textarea" id="q-hate" placeholder="Что вы не едите...">${d.hate || ''}</textarea></div>
        <div class="form-group"><label class="form-label">Исключаемые продукты</label><textarea class="form-textarea" id="q-exclude" placeholder="Продукты, которые нужно исключить...">${d.exclude || ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Предпочтения на завтрак</label><textarea class="form-textarea" id="q-breakfast" placeholder="Что любите на завтрак...">${d.breakfastPref || ''}</textarea></div>
          <div class="form-group"><label class="form-label">Предпочтения на обед</label><textarea class="form-textarea" id="q-lunch" placeholder="Что любите на обед...">${d.lunchPref || ''}</textarea></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Предпочтения на ужин</label><textarea class="form-textarea" id="q-dinner" placeholder="Что любите на ужин...">${d.dinnerPref || ''}</textarea></div>
          <div class="form-group"><label class="form-label">Любимые перекусы</label><textarea class="form-textarea" id="q-snacks" placeholder="Что любите перекусить...">${d.snackPref || ''}</textarea></div>
        </div>
        <div class="form-group"><label class="form-label">Напитки</label><textarea class="form-textarea" id="q-drinks" placeholder="Что пьёте обычно...">${d.drinks || ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Кол-во приёмов пищи</label>
            <select class="form-select" id="q-mealCount">
              ${[3,4,5,6].map(n => `<option value="${n}" ${d.mealCount == n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Бюджетное меню?</label>
            <select class="form-select" id="q-budget">
              <option value="no" ${d.budget !== 'yes' ? 'selected' : ''}>Нет</option>
              <option value="yes" ${d.budget === 'yes' ? 'selected' : ''}>Да, важно</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Быстрые блюда?</label>
            <select class="form-select" id="q-quick">
              <option value="no" ${d.quick !== 'yes' ? 'selected' : ''}>Нет, готовлю долго</option>
              <option value="yes" ${d.quick === 'yes' ? 'selected' : ''}>Да, нужно быстро</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Время для готовки (мин/день)</label><input class="form-input" type="number" id="q-cookTime" value="${d.cookTime || ''}" min="0" max="300" placeholder="30"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Наличие кухонных весов</label>
          <div class="radio-group">
            <label class="radio-card ${d.scale !== 'no' ? 'selected' : ''}" onclick="document.getElementById('q-scale').value='yes'">
              <input type="radio" name="scale" value="yes" ${d.scale !== 'no' ? 'checked' : ''}>
              <div class="radio-card-title">Да, есть весы</div>
            </label>
            <label class="radio-card ${d.scale === 'no' ? 'selected' : ''}" onclick="document.getElementById('q-scale').value='no'">
              <input type="radio" name="scale" value="no" ${d.scale === 'no' ? 'checked' : ''}>
              <div class="radio-card-title">Нет, взвешиваю «на глаз»</div>
            </label>
          </div>
          <input type="hidden" id="q-scale" value="${d.scale || 'yes'}">
        </div>
      `;
    },

    // Шаг 6: Физическая активность
    () => {
      const d = data.step6 || {};
      const activityLevels = [
        { id: 'min', label: 'Минимальная', desc: 'Сидячий образ жизни, мало движения' },
        { id: 'light', label: 'Лёгкая', desc: '1-3 тренировки в неделю' },
        { id: 'moderate', label: 'Средняя', desc: '3-5 тренировок в неделю' },
        { id: 'high', label: 'Высокая', desc: '6-7 тренировок в неделю' },
      ];
      return `
        <div class="step-title">Физическая активность</div>
        <div class="step-desc">Это влияет на расчёт суточной потребности в калориях</div>
        <div class="form-group"><label class="form-label">Тип работы</label>
          <select class="form-select" id="q-workType">
            <option value="sedentary" ${d.workType === 'sedentary' ? 'selected' : ''}>Сидячая (офис, за компьютером)</option>
            <option value="standing" ${d.workType === 'standing' ? 'selected' : ''}>На ногах (продавец, учитель, врач)</option>
            <option value="physical" ${d.workType === 'physical' ? 'selected' : ''}>Физическая (грузчик, строитель)</option>
            <option value="mixed" ${d.workType === 'mixed' ? 'selected' : ''}>Смешанная</option>
          </select>
          <div class="form-hint">Если выбрана «Смешанная», уточните ниже тип и продолжительность активности</div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Шагов в день</label><input class="form-input" type="number" id="q-steps" value="${d.steps || ''}" placeholder="5000" min="0" max="50000"></div>
          <div class="form-group"><label class="form-label">Уровень активности</label>
            <select class="form-select" id="q-activity">
              ${activityLevels.map(a => `<option value="${a.id}" ${d.activity === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Физические тренировки</label>
          <div class="radio-group">
            <label class="radio-card ${d.training === 'no' ? 'selected' : ''}" onclick="document.getElementById('q-training').value='no'">
              <input type="radio" name="training" value="no" ${d.training === 'no' ? 'checked' : ''}>
              <div class="radio-card-title">Не тренируюсь</div>
            </label>
            <label class="radio-card ${d.training === 'yes' ? 'selected' : ''}" onclick="document.getElementById('q-training').value='yes'">
              <input type="radio" name="training" value="yes" ${d.training === 'yes' ? 'checked' : ''}>
              <div class="radio-card-title">Тренируюсь</div>
            </label>
          </div>
          <input type="hidden" id="q-training" value="${d.training || 'no'}">
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Частота (раз/нед)</label><input class="form-input" type="number" id="q-trainFreq" value="${d.trainFreq || ''}" placeholder="3" min="0" max="14"></div>
          <div class="form-group"><label class="form-label">Длительность (мин)</label><input class="form-input" type="number" id="q-trainDur" value="${d.trainDur || ''}" placeholder="60" min="0" max="300"></div>
        </div>
        <div class="form-group"><label class="form-label">Тип тренировок / доп. активность</label><textarea class="form-textarea" id="q-trainType" placeholder="Кардио, силовые, йога, плавание...">${d.trainType || ''}</textarea></div>
      `;
    },
  ];

  const renderStep = () => {
    const stepNum = step + 1;
    let dots = '';
    for (let i = 0; i < totalSteps; i++) {
      dots += `<div class="step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}"></div>`;
    }

    let html = `
      <div class="step-indicator">${dots}</div>
      <div class="step-header"><span class="step-num">Шаг ${stepNum} из ${totalSteps}</span></div>
      ${steps[step]()}
      <div class="btn-row mt-4">
        ${step > 0 ? '<button class="btn btn-outline" onclick="window._qPrev()">← Назад</button>' : ''}
        ${step < totalSteps - 1 ? '<button class="btn btn-primary" style="margin-left:auto" onclick="window._qNext()">Далее →</button>' : '<button class="btn btn-gold" style="margin-left:auto" onclick="window._qSave()">Сохранить анкету</button>'}
      </div>`;

    App.render(html);
  };

  const collectStep = (s) => {
    const d = {};
    if (s === 0) {
      const get = id => document.getElementById(id)?.value;
      d.name = get('q-name'); d.birthdate = get('q-birthdate'); d.age = +get('q-age');
      d.gender = get('q-gender'); d.height = +get('q-height'); d.weight = +get('q-weight');
      d.weightDate = get('q-weightDate'); d.targetWeight = +get('q-targetWeight');
      d.maxWeight = +get('q-maxWeight'); d.minWeight = +get('q-minWeight');
      d.waist = +get('q-waist'); d.belly = +get('q-belly'); d.hips = +get('q-hips');
      d.chest = +get('q-chest'); d.arm = +get('q-arm');
    } else if (s === 1) {
      d.goals = [...document.querySelectorAll('#goal-chips .chip.selected')].map(c => c.dataset.val);
      d.reason = val('q-reason'); d.prevAttempts = val('q-prevAttempts');
      d.difficulties = val('q-difficulties'); d.expectations = val('q-expectations');
    } else if (s === 2) {
      d.conditions = [...document.querySelectorAll('#cond-chips .chip.selected')].map(c => c.dataset.val);
      d.allergies = val('q-allergies'); d.meds = val('q-meds');
      d.supplements = val('q-supplements'); d.restrictions = val('q-restrictions');
      d.complaints = val('q-complaints');
    } else if (s === 3) {
      d.appetite = +val('q-appetite'); d.stress = +val('q-stress');
      d.craving = +val('q-craving'); d.readiness = +val('q-readiness');
      d.flags = [...document.querySelectorAll('.chip.selected[data-val]')].filter(c => ['emotional','night','snacking','lossControl','history'].includes(c.dataset.val)).map(c => c.dataset.val);
      d.hungerSatiety = val('q-hungerSatiety');
    } else if (s === 4) {
      d.love = val('q-love'); d.hate = val('q-hate'); d.exclude = val('q-exclude');
      d.breakfastPref = val('q-breakfast'); d.lunchPref = val('q-lunch');
      d.dinnerPref = val('q-dinner'); d.snackPref = val('q-snacks');
      d.drinks = val('q-drinks'); d.mealCount = +val('q-mealCount');
      d.budget = val('q-budget'); d.quick = val('q-quick');
      d.cookTime = +val('q-cookTime'); d.scale = val('q-scale');
    } else if (s === 5) {
      d.workType = val('q-workType'); d.steps = +val('q-steps');
      d.activity = val('q-activity'); d.training = val('q-training');
      d.trainFreq = +val('q-trainFreq'); d.trainDur = +val('q-trainDur');
      d.trainType = val('q-trainType');
    }
    return d;
  };

  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };

  window._qNext = () => {
    data['step' + (step + 1)] = collectStep(step);
    // Сохраняем измерения на первом шаге
    if (step === 0) {
      const d = data.step1;
      if (d.weight) Store.addMeasurement({ weight: d.weight, waist: d.waist, belly: d.belly, hips: d.hips, date: d.weightDate });
    }
    step++;
    renderStep();
  };
  window._qPrev = () => { data['step' + (step + 1)] = collectStep(step); step--; renderStep(); };
  window._qSave = () => {
    data['step' + (step + 1)] = collectStep(step);
    data.completedAt = new Date().toISOString();
    Store.saveQuestionnaire(data);
    App.toast('Анкета сохранена');
    App.navigate('/calculator');
  };

  // Превью расчётов для шага 1
  Views._calcPreview = (d) => {
    if (!d.weight || !d.height) return '';
    const bmi = Calc.bmi(d.weight, d.height);
    const whtr = d.waist ? Calc.whtr(d.waist, d.height) : null;
    let html = `<div class="card mt-4" style="background:var(--emerald-bg)"><div class="card-title">📊 Предварительный расчёт</div>`;
    html += `<div class="form-row"><div><strong>ИМТ:</strong> ${bmi.value} (${bmi.category})</div>`;
    if (whtr) html += `<div><strong>Талия/рост:</strong> ${whtr.value} (${whtr.category})</div>`;
    html += `</div>`;
    if (d.targetWeight && d.weight) {
      const diff = (d.weight - d.targetWeight).toFixed(1);
      html += `<div class="text-sm mt-2">Изменение веса до цели: <strong>${diff > 0 ? '-' : ''}${Math.abs(diff)} кг</strong></div>`;
    }
    html += `</div>`;
    return html;
  };

  renderStep();
};
