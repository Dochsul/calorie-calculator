/**
 * AINA MENU — Хранилище данных
 * Локальный прототип: авторизация и данные в localStorage.
 * Честно обозначен как локальный прототип, не облачный сервис.
 */

const STORAGE_KEY = 'aina_menu_data_v1';
const SESSION_KEY = 'aina_menu_session_v1';

const Store = {
  data: { users: {} },
  session: null, // { email, role }

  init() {
    this._load();
    this._loadSession();
  },

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.data = JSON.parse(raw);
    } catch (e) { this.data = { users: {} }; }
    if (!this.data.users) this.data.users = {};
  },

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  _loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw);
    } catch (e) { this.session = null; }
  },

  _saveSession() {
    if (this.session) localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    else localStorage.removeItem(SESSION_KEY);
  },

  // ── Авторизация (локальный прототип) ──
  register(email, password, name, role = 'client') {
    email = email.toLowerCase().trim();
    if (this.data.users[email]) return { ok: false, error: 'Пользователь с таким email уже зарегистрирован' };
    this.data.users[email] = {
      email, name, role, password: btoa(password),
      questionnaire: null,
      calcResults: null,
      measurements: [],
      menus: {},
      recipes: [],
      sharedWithSpecialist: false,
      specialistAdjustments: {},
      approvedMenus: {}
    };
    this._save();
    this.session = { email, role };
    this._saveSession();
    return { ok: true };
  },

  login(email, password) {
    email = email.toLowerCase().trim();
    const user = this.data.users[email];
    if (!user || user.password !== btoa(password)) return { ok: false, error: 'Неверный email или пароль' };
    this.session = { email, role: user.role };
    this._saveSession();
    return { ok: true };
  },

  logout() {
    this.session = null;
    this._saveSession();
  },

  isLoggedIn() { return !!this.session; },
  isSpecialist() { return this.session && this.session.role === 'specialist'; },
  currentUser() { return this.session ? this.data.users[this.session.email] : null; },
  currentEmail() { return this.session ? this.session.email : null; },

  // ── Анкета ──
  saveQuestionnaire(data) {
    const u = this.currentUser(); if (!u) return;
    u.questionnaire = { ...data, updatedAt: new Date().toISOString() };
    this._save();
  },
  getQuestionnaire() { const u = this.currentUser(); return u ? u.questionnaire : null; },

  // ── Результаты расчёта ──
  saveCalcResults(r) {
    const u = this.currentUser(); if (!u) return;
    u.calcResults = { ...r, updatedAt: new Date().toISOString() };
    this._save();
  },
  getCalcResults() { const u = this.currentUser(); return u ? u.calcResults : null; },

  // ── Измерения ──
  addMeasurement(m) {
    const u = this.currentUser(); if (!u) return;
    m.date = m.date || new Date().toISOString().slice(0, 10);
    u.measurements.push(m);
    u.measurements.sort((a, b) => a.date.localeCompare(b.date));
    this._save();
  },
  getMeasurements() { const u = this.currentUser(); return u ? u.measurements : []; },

  // ── Меню по дате ──
  saveMenu(date, menu) {
    const u = this.currentUser(); if (!u) return;
    u.menus[date] = { ...menu, savedAt: new Date().toISOString() };
    this._save();
  },
  getMenu(date) { const u = this.currentUser(); return u ? u.menus[date] : null; },
  getAllMenus() { const u = this.currentUser(); return u ? u.menus : {}; },

  // ── Рецепты ──
  saveRecipe(recipe) {
    const u = this.currentUser(); if (!u) return;
    if (!recipe.id) recipe.id = 'r_' + Date.now();
    const idx = u.recipes.findIndex(r => r.id === recipe.id);
    if (idx >= 0) u.recipes[idx] = recipe; else u.recipes.push(recipe);
    this._save();
    return recipe;
  },
  deleteRecipe(id) {
    const u = this.currentUser(); if (!u) return;
    u.recipes = u.recipes.filter(r => r.id !== id);
    this._save();
  },
  getRecipes() { const u = this.currentUser(); return u ? u.recipes : []; },

  // ── Общий доступ (для специалиста) ──
  toggleSharing(on) {
    const u = this.currentUser(); if (!u) return;
    u.sharedWithSpecialist = !!on;
    this._save();
  },
  getSharing() { const u = this.currentUser(); return u ? !!u.sharedWithSpecialist : false; },

  // ── Кабинет специалиста ──
  getClients() {
    return Object.values(this.data.users).filter(u => u.role === 'client' && u.sharedWithSpecialist);
  },
  getClient(email) { return this.data.users[email.toLowerCase().trim()] || null; },

  approveMenu(clientEmail, date) {
    const c = this.getClient(clientEmail); if (!c) return;
    c.approvedMenus[date] = new Date().toISOString();
    this._save();
  },
  isMenuApproved(clientEmail, date) {
    const c = this.getClient(clientEmail); return c && !!c.approvedMenus[date];
  },
  setSpecialistAdjustment(clientEmail, adjustments) {
    const c = this.getClient(clientEmail); if (!c) return;
    c.specialistAdjustments = { ...c.specialistAdjustments, ...adjustments, at: new Date().toISOString() };
    this._save();
  },

  // ── Удаление профиля ──
  deleteProfile() {
    const email = this.currentEmail(); if (!email) return;
    delete this.data.users[email];
    this._save();
    this.logout();
  },

  // ── Экспорт данных ──
  exportData() {
    const u = this.currentUser(); if (!u) return null;
    const { password, ...safe } = u;
    return safe;
  }
};
