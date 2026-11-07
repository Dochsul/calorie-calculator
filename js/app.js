/**
 * AINA MENU — Главный модуль приложения
 * Роутер, хелперы, главная страница, настройки
 */

const App = {
  routes: {},
  view: 'home',
  menuData: null, // данные текущего меню (между видами)

  init() {
    Store.init();
    this.routes = {
      '/login': () => Views.auth(),
      '/': () => App.home(),
      '/questionnaire': () => Views.questionnaire(),
      '/calculator': () => Views.calculator(),
      '/menu': () => Views.menu(),
      '/history': () => Views.history(),
      '/measurements': () => Views.measurements(),
      '/recipes': () => Views.recipes(),
      '/specialist': () => Views.specialist(),
      '/settings': () => App.settings(),
    };
    window.addEventListener('hashchange', () => this.router());
    this.router();
  },

  router() {
    if (!Store.isLoggedIn()) {
      this.renderAuth();
      return;
    }
    const hash = location.hash.slice(1) || '/';
    this.view = hash;
    const fn = this.routes[hash] || this.routes['/'];
    fn();
  },

  navigate(path) {
    location.hash = path;
  },

  // ── Рендер ──
  render(content, showNav = true) {
    const nav = showNav ? this.bottomNav() : '';
    const header = this.header();
    document.querySelector('#app').innerHTML = `
      <div class="app">
        ${header}
        <div class="main" id="main-content">${content}</div>
        ${nav}
      </div>`;
    window.scrollTo(0, 0);
  },

  renderAuth() {
    document.querySelector('#app').innerHTML = `<div class="app" id="auth-root"></div>`;
    Views.auth();
  },

  header() {
    const u = Store.currentUser();
    if (!u) return '';
    const isSpec = Store.isSpecialist();
    return `
      <div class="header">
        <div class="header-row">
          <div class="brand" onclick="App.navigate('/')" style="cursor:pointer">
            <div class="brand-logo">A</div>
            <div class="brand-text">
              <div class="brand-name">AINA MENU</div>
              <div class="brand-sub">AINA Evidence</div>
            </div>
          </div>
          <div class="header-user">
            <span class="header-user-name">${u.name}${isSpec ? ' · Специалист' : ''}</span>
            <button class="header-btn" onclick="App.navigate('/settings')">Настройки</button>
          </div>
        </div>
      </div>`;
  },

  bottomNav() {
    const items = [
      { path: '/', label: 'Главная', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg>' },
      { path: '/menu', label: 'Меню', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18M3 12h18M3 19h18"/></svg>' },
      { path: '/calculator', label: 'КБЖУ', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h4M8 18h4"/></svg>' },
      { path: '/history', label: 'История', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
      { path: '/settings', label: 'Ещё', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L16 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L12 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1.2z"/></svg>' },
    ];
    let html = '<div class="bottom-nav no-print">';
    for (const it of items) {
      const active = this.view === it.path ? 'active' : '';
      html += `<button class="nav-item ${active}" onclick="App.navigate('${it.path}')">${it.icon}<span>${it.label}</span></button>`;
    }
    if (Store.isSpecialist()) {
      // Заменяем "Ещё" на "Кабинет" для специалиста
    }
    html += '</div>';
    return html;
  },

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  },

  // ── Главная страница ──
  home() {
    const u = Store.currentUser();
    const q = Store.getQuestionnaire();
    const calc = Store.getCalcResults();
    const menus = Store.getAllMenus();

    let steps = [];
    if (!q) steps.push({ num: 1, title: 'Заполнить анкету', desc: 'Подробная анкета AINA Evidence', path: '/questionnaire' });
    if (!calc) steps.push({ num: 2, title: 'Рассчитать КБЖУ', desc: 'Персональный калькулятор калорий и БЖУ', path: '/calculator' });
    steps.push({ num: q && calc ? 1 : steps.length + 1, title: 'Составить меню на завтра', desc: 'Главное приложение — конструктор питания', path: '/menu' });

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const hasMenuToday = !!menus[today];

    let html = `
      <h1 class="page-title">Добро пожаловать, ${u.name}!</h1>
      <p class="page-subtitle">${q && calc ? 'Ваш персональный конструктор питания готов к работе' : 'Пройдите базовую настройку, чтобы начать'}</p>`;

    if (q && calc) {
      html += `
        <div class="card">
          <div class="card-title">📊 Ваша норма</div>
          <div class="result-grid">
            <div class="result-tile"><div class="label">Калории</div><div class="value">${calc.targetKcal}</div><div class="unit">ккал/день</div></div>
            <div class="result-tile"><div class="label">Белки</div><div class="value">${calc.macros.protein}</div><div class="unit">г/день</div></div>
            <div class="result-tile"><div class="label">Жиры</div><div class="value">${calc.macros.fat}</div><div class="unit">г/день</div></div>
            <div class="result-tile"><div class="label">Углеводы</div><div class="value">${calc.macros.carbs}</div><div class="unit">г/день</div></div>
          </div>
          <button class="btn btn-outline btn-sm btn-block" onclick="App.navigate('/calculator')">Изменить расчёт</button>
        </div>`;
    }

    html += `<div class="card"><div class="card-title">🚀 Быстрый старт</div>`;
    for (const s of steps) {
      html += `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100);cursor:pointer" onclick="App.navigate('${s.path}')">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--emerald);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${s.num}</div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:15px;color:var(--gray-800)">${s.title}</div>
            <div style="font-size:13px;color:var(--gray-500)">${s.desc}</div>
          </div>
          <span style="color:var(--emerald)">→</span>
        </div>`;
    }
    html += `</div>`;

    // Быстрый доступ к разделам
    html += `
      <div class="card">
        <div class="card-title">📁 Разделы</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button class="btn btn-outline btn-sm" onclick="App.navigate('/menu')">🍽 Меню на завтра</button>
          <button class="btn btn-outline btn-sm" onclick="App.navigate('/recipes')">📖 Мои рецепты</button>
          <button class="btn btn-outline btn-sm" onclick="App.navigate('/measurements')">📏 Измерения</button>
          <button class="btn btn-outline btn-sm" onclick="App.navigate('/history')">📅 История меню</button>
          ${Store.isSpecialist() ? `<button class="btn btn-gold btn-sm" onclick="App.navigate('/specialist')">👩‍⚕️ Кабинет специалиста</button>` : ''}
        </div>
      </div>`;

    this.render(html);
  },

  // ── Настройки ──
  settings() {
    const u = Store.currentUser();
    const sharing = Store.getSharing();
    let html = `
      <h1 class="page-title">Настройки</h1>
      <p class="page-subtitle">Управление профилем и данными</p>

      <div class="card">
        <div class="card-title">👤 Профиль</div>
        <div style="font-size:14px;line-height:2">
          <div><strong>Имя:</strong> ${u.name}</div>
          <div><strong>Email:</strong> ${u.email}</div>
          <div><strong>Роль:</strong> ${u.role === 'specialist' ? 'Специалист AINA Evidence' : 'Клиент'}</div>
        </div>
      </div>`;

    if (u.role === 'client') {
      html += `
        <div class="card">
          <div class="card-title">🔐 Доступ специалисту</div>
          <p class="text-sm text-muted mb-2">Разрешите специалисту AINA Evidence просматривать вашу анкету, меню и историю измерений.</p>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" id="sharing-toggle" ${sharing ? 'checked' : ''} onchange="App.toggleSharing(this.checked)" style="width:20px;height:20px;accent-color:var(--emerald)">
            <span style="font-size:14px;font-weight:600">Предоставить доступ специалисту</span>
          </label>
        </div>`;
    }

    html += `
      <div class="card">
        <div class="card-title">📥 Экспорт данных</div>
        <p class="text-sm text-muted mb-2">Скачайте копию ваших персональных данных (GDPR).</p>
        <button class="btn btn-outline btn-sm" onclick="App.exportData()">Экспортировать данные (JSON)</button>
      </div>

      <div class="card">
        <div class="card-title">ℹ️ О приложении</div>
        <div class="auth-notice" style="margin:0">
          <strong>Локальный прототип.</strong> Данные хранятся в браузере (localStorage). Это не облачный сервис. Приложение AINA MENU предназначено для клиентов консультанта-диетолога.
        </div>
        <p class="text-sm text-muted mt-2">Бренд: AINA Evidence<br>Расчёты КБЖУ выполняются программно на основе подтверждённых продуктов из базы данных.</p>
      </div>

      <div class="card">
        <div class="card-title">⚠️ Опасная зона</div>
        <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteProfile()">Удалить профиль и все данные</button>
      </div>

      <button class="btn btn-outline btn-block mb-4" onclick="App.logout()">Выйти</button>`;

    this.render(html);
  },

  toggleSharing(on) {
    Store.toggleSharing(on);
    this.toast(on ? 'Доступ специалисту предоставлен' : 'Доступ отозван');
  },

  exportData() {
    const data = Store.exportData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aina_menu_data.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toast('Данные экспортированы');
  },

  confirmDeleteProfile() {
    if (confirm('Вы уверены? Все ваши данные будут удалены безвозвратно.')) {
      Store.deleteProfile();
      this.toast('Профиль удалён');
      setTimeout(() => this.router(), 500);
    }
  },

  logout() {
    Store.logout();
    this.router();
  },
};
