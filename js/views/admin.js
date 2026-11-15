// Админ-панель Aina Évidence: пользователи, подписчики, выручка, тарифы.
import { api } from "../api.js";
import { isAuthenticated, isAdmin, logout } from "../auth.js";
import { esc } from "../ui.js";

export async function renderAdmin(root) {
  if (!isAuthenticated()) {
    renderLoginRequired(root);
    return;
  }
  if (!isAdmin()) {
    renderAccessDenied(root);
    return;
  }

  try {
    const [stats, settings] = await Promise.all([
      api.getAdminStats(),
      api.getAdminSettings(),
    ]);
    renderPanel(root, stats, settings);
  } catch (err) {
    root.innerHTML = `<section class="card"><p class="pw-err">Ошибка загрузки данных: ${esc(err.message)}</p></section>`;
  }
}

function renderLoginRequired(root) {
  root.innerHTML = `
    <section class="card adm-login">
      <h2>Админ-панель</h2>
      <p class="hint">Войдите с админской учётной записью.</p>
      <button class="btn primary" id="adm_login">Перейти к входу</button>
    </section>`;
  root.querySelector("#adm_login").onclick = () => window.dispatchEvent(new Event("aina-logout"));
}

function renderAccessDenied(root) {
  root.innerHTML = `
    <section class="card adm-login">
      <h2>Доступ запрещён</h2>
      <p class="hint">У вас нет прав администратора.</p>
      <button class="btn sm" id="adm_back">Назад</button>
    </section>`;
  root.querySelector("#adm_back").onclick = () => logout();
}

async function renderPanel(root, stats, settings) {
  const plans = settings.plans || [];
  const initFee = settings.init_fee || { enabled: false, amount: 2990, displayAmount: "29.90" };
  const freeFeatures = settings.free_features || {};

  root.innerHTML = `
    <section class="card admin-panel">
      <div class="card-head">
        <h2>Панель владельца Aina Évidence</h2>
        <button class="btn sm" id="adm_logout">Выйти</button>
      </div>

      <div class="admin-stats">
        <div class="admin-stat-card">
          <div class="stat-label">Всего пользователей</div>
          <div class="stat-value">${stats.totalUsers}</div>
        </div>
        <div class="admin-stat-card">
          <div class="stat-label">Активные подписчики</div>
          <div class="stat-value">${stats.activeSubscribers}</div>
        </div>
        <div class="admin-stat-card">
          <div class="stat-label">Отменённые подписки</div>
          <div class="stat-value">${stats.canceledSubscriptions}</div>
        </div>
        <div class="admin-stat-card admin-revenue">
          <div class="stat-label">Выручка за день</div>
          <div class="stat-value">${(stats.revenueDay / 100).toFixed(2)} €</div>
        </div>
        <div class="admin-stat-card admin-revenue">
          <div class="stat-label">Выручка за месяц</div>
          <div class="stat-value">${(stats.revenueMonth / 100).toFixed(2)} €</div>
        </div>
        <div class="admin-stat-card admin-revenue">
          <div class="stat-label">Выручка за год</div>
          <div class="stat-value">${(stats.revenueYear / 100).toFixed(2)} €</div>
        </div>
      </div>

      <div class="admin-section">
        <h3>Выручка по тарифам</h3>
        <div class="admin-plan-revenue">
          ${(stats.revenueByPlan || []).map((r) => `
            <div class="plan-rev-row">
              <span>${esc(r.planId)}</span>
              <span>${r.count} продаж</span>
              <b>${(r.total / 100).toFixed(2)} €</b>
            </div>
          `).join("") || "<p class='hint'>Нет данных</p>"}
        </div>
      </div>

      <div class="admin-section">
        <h3>Неудачные платежи</h3>
        <div class="admin-failed">
          <span>Количество: <b>${stats.failedPayments?.count || 0}</b></span>
          <span>Сумма: <b>${((stats.failedPayments?.total || 0) / 100).toFixed(2)} €</b></span>
        </div>
      </div>

      <div class="admin-section">
        <h3>Настройка тарифов</h3>
        <div class="admin-plans-edit">
          ${plans.map((p, i) => `
            <div class="plan-edit-row" data-idx="${i}">
              <label>Название<input type="text" data-field="label" value="${esc(p.label)}"></label>
              <label>Цена (€)<input type="text" data-field="displayPrice" value="${esc(p.displayPrice || "")}"></label>
              <label>Цена (центов)<input type="number" data-field="price" value="${p.price || 0}"></label>
              <label>ID<input type="text" data-field="id" value="${esc(p.id)}" readonly></label>
            </div>
          `).join("")}
        </div>
        <button class="btn primary" id="adm_save_plans">Сохранить тарифы</button>
      </div>

      <div class="admin-section">
        <h3>Разовый вступительный платёж</h3>
        <div class="admin-init-fee">
          <label class="chk"><input type="checkbox" id="adm_fee_enabled" ${initFee.enabled ? "checked" : ""}> Включить вступительный взнос</label>
          <label>Сумма (€)<input type="text" id="adm_fee_amount" value="${esc(initFee.displayAmount || "")}"></label>
          <label>Сумма (центов)<input type="number" id="adm_fee_cents" value="${initFee.amount || 0}"></label>
        </div>
        <button class="btn primary" id="adm_save_fee">Сохранить</button>
      </div>

      <div class="admin-section">
        <h3>Бесплатные функции</h3>
        <div class="admin-free-features">
          ${Object.entries(freeFeatures).map(([key, val]) => `
            <label class="chk"><input type="checkbox" data-feature="${key}" ${val ? "checked" : ""}> ${esc(FEATURE_LABELS[key] || key)}</label>
          `).join("")}
        </div>
        <button class="btn primary" id="adm_save_free">Сохранить</button>
      </div>

      <div class="admin-section">
        <h3>Пользователи (${stats.users?.length || 0})</h3>
        <div class="admin-users">
          ${(stats.users || []).map((u) => `
            <div class="admin-user-row">
              <span class="user-email">${esc(u.email)}</span>
              <span class="user-name">${esc(u.name || "—")}</span>
              <span class="user-plan">${u.activePlan ? esc(u.activePlan) : "нет подписки"}</span>
              <span class="user-status ${u.subStatus || ""}">${u.subStatus || "—"}}</span>
              <span class="user-date">${new Date(u.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div id="adm_msg" class="adm-msg" hidden></div>
    </section>`;

  root.querySelector("#adm_logout").onclick = () => logout();

  // Сохранить тарифы
  root.querySelector("#adm_save_plans").onclick = async () => {
    const newPlans = Array.from(root.querySelectorAll(".plan-edit-row")).map((row) => {
      const get = (f) => row.querySelector(`[data-field="${f}"]`).value;
      return {
        id: get("id"),
        label: get("label"),
        displayPrice: get("displayPrice"),
        price: parseInt(get("price"), 10) || 0,
        currency: "eur",
        interval: get("id") === "monthly" ? "month" : get("id") === "quarterly" ? "3-month" : "year",
      };
    });
    try {
      await api.updatePlans(newPlans);
      showMsg(root, "Тарифы сохранены");
    } catch (err) { showMsg(root, "Ошибка: " + err.message, true); }
  };

  // Сохранить вступительный платёж
  root.querySelector("#adm_save_fee").onclick = async () => {
    const newFee = {
      enabled: root.querySelector("#adm_fee_enabled").checked,
      displayAmount: root.querySelector("#adm_fee_amount").value,
      amount: parseInt(root.querySelector("#adm_fee_cents").value, 10) || 0,
      currency: "eur",
    };
    try {
      await api.updateInitFee(newFee);
      showMsg(root, "Вступительный платёж сохранён");
    } catch (err) { showMsg(root, "Ошибка: " + err.message, true); }
  };

  // Сохранить бесплатные функции
  root.querySelector("#adm_save_free").onclick = async () => {
    const newFree = {};
    root.querySelectorAll("[data-feature]").forEach((chk) => {
      newFree[chk.dataset.feature] = chk.checked;
    });
    try {
      await api.updateFreeFeatures(newFree);
      showMsg(root, "Бесплатные функции сохранены");
    } catch (err) { showMsg(root, "Ошибка: " + err.message, true); }
  };
}

function showMsg(root, msg, isError = false) {
  const el = root.querySelector("#adm_msg");
  el.textContent = msg;
  el.className = "adm-msg " + (isError ? "error" : "ok");
  el.hidden = false;
}

const FEATURE_LABELS = {
  questionnaire: "Заполнение анкеты",
  viewResults: "Просмотр результатов КБЖУ",
  pantry: "Продукты дома",
  menu: "Генерация меню",
  dishes: "Создание блюд",
  shopping: "Список покупок",
  report: "Дневник питания",
  templates: "Шаблоны",
};
