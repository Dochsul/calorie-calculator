// Экран оплаты: тарифы в евро, Stripe Checkout, управление подпиской.
import { api } from "../api.js";
import { isAuthenticated, isAdmin, checkSubscription, logout } from "../auth.js";
import { esc } from "../ui.js";

let _plans = null;

async function loadPlans() {
  if (_plans) return _plans;
  try {
    const data = await api.getPlans();
    _plans = data;
    return data;
  } catch {
    return { plans: [], initFee: { enabled: false }, freeFeatures: {} };
  }
}

export async function renderPaywall(root) {
  const authed = isAuthenticated();
  const { plans, initFee, freeFeatures } = await loadPlans();
  const sub = authed ? await checkSubscription() : { active: false, subscription: null, payments: [] };

  if (authed && sub.active) {
    renderActiveSubscription(root, sub);
    return;
  }

  root.innerHTML = `
    <section class="paywall">
      <div class="pw-card">
        <div class="pw-brand"><span class="mark">A</span> Aina <em>évidence</em></div>
        <div class="pw-subtitle">Персональный конструктор меню</div>
        <h1 class="pw-title">Выберите тариф</h1>
        <p class="pw-sub">Персональное меню любой сложности: расчёт КБЖУ, меню по дням, замены продуктов, список покупок и экспорт в PDF.</p>

        <div class="pw-plans-label">Тарифы подписки</div>
        <div class="pw-plans">
          ${(plans || []).map((p, i) => `
            <div class="pw-plan ${i === 1 ? "pw-plan-popular" : ""}" data-plan-id="${esc(p.id)}" style="cursor:pointer" role="button" tabindex="0">
              ${p.save ? `<div class="pw-plan-badge">${esc(p.save)}</div>` : ""}
              <div class="pw-plan-name">${esc(p.label)}</div>
              <div class="pw-plan-price">${esc(p.displayPrice || p.price)} €</div>
              <div class="pw-plan-per">${esc(p.label)} · автоматическое продление</div>
              <div class="pw-plan-cta">Выбрать</div>
            </div>
          `).join("")}
        </div>

        ${initFee && initFee.enabled ? `
          <div class="pw-init-fee">
            <p>Дополнительно: разовый вступительный взнос — <b>${esc(initFee.displayAmount || initFee.amount)} €</b></p>
          </div>` : ""}

        <div class="pw-terms">
          <p>Перед оплатой вы увидите полную цену, период списания и все дополнительные платежи на странице Stripe.</p>
          <p>Оплата осуществляется через Stripe — безопасная обработка карт. Автоматическое продление можно отменить в любой момент.</p>
          <p class="pw-stripe-note"> Stripe работает в тестовом режиме. Для реальных платежей потребуется подтверждённый Stripe-аккаунт.</p>
        </div>

        <div id="pw_error" class="pw-err" hidden></div>

        ${authed ? "" : `
          <p class="auth-hint">Зарегистрируйтесь или войдите, чтобы оформить подписку.</p>
          <button class="btn primary" id="pw_auth" type="button">Вход / Регистрация</button>
        `}

        ${authed ? `
          <button class="btn sm" id="pw_logout" type="button">Выйти из аккаунта</button>
        ` : ""}
      </div>
    </section>`;

  const errEl = root.querySelector("#pw_error");

  // Клик по тарифу → Stripe Checkout
  root.querySelectorAll("[data-plan-id]").forEach((card) => {
    const choose = async () => {
      const planId = card.dataset.planId;
      if (!isAuthenticated()) {
        errEl.textContent = "Сначала войдите или зарегистрируйтесь";
        errEl.hidden = false;
        return;
      }
      errEl.hidden = true;
      try {
        const result = await api.createCheckout(planId, window.location.origin + "/?payment=success", window.location.origin + "/?payment=cancel");
        if (result.url) {
          window.location.href = result.url;
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    };
    card.onclick = choose;
    card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } };
  });

  const authBtn = root.querySelector("#pw_auth");
  if (authBtn) authBtn.onclick = () => window.dispatchEvent(new Event("aina-logout"));

  const logoutBtn = root.querySelector("#pw_logout");
  if (logoutBtn) logoutBtn.onclick = () => logout();
}

function renderActiveSubscription(root, sub) {
  const s = sub.subscription || {};
  const end = s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("ru-RU") : "—";
  const payments = sub.payments || [];

  root.innerHTML = `
    <section class="paywall">
      <div class="pw-card">
        <div class="pw-brand"><span class="mark">A</span> Aina <em>évidence</em></div>
        <h1 class="pw-title">Моя подписка</h1>
        <div class="sub-status active">Статус: активна</div>
        <div class="sub-info">
          <p>Тариф: <b>${esc(s.planId || "—")}</b></p>
          <p>Действует до: <b>${end}</b></p>
          ${s.cancelAtPeriodEnd ? '<p class="sub-canceling">Подписка будет отменена в конце периода</p>' : ""}
        </div>
        ${!s.cancelAtPeriodEnd ? '<button class="btn sm" id="sub_cancel">Отменить подписку</button>' : ""}

        <h3 class="sub-payments-title">История платежей</h3>
        <div class="sub-payments">
          ${payments.length ? payments.map((p) => `
            <div class="sub-payment-row">
              <span>${new Date(p.createdAt).toLocaleDateString("ru-RU")}</span>
              <span>${(p.amount / 100).toFixed(2)} €</span>
              <span class="sub-pay-status ${p.status}">${p.status === "succeeded" ? "оплачен" : p.status}</span>
            </div>
          `).join("") : "<p class='hint'>Платежей пока нет.</p>"}
        </div>

        <button class="btn sm" id="sub_logout" type="button">Выйти</button>
        <div id="sub_err" class="pw-err" hidden></div>
      </div>
    </section>`;

  const cancelBtn = root.querySelector("#sub_cancel");
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      if (!confirm("Отменить подписку в конце оплаченного периода?")) return;
      try {
        await api.cancelSubscription();
        await renderPaywall(root);
      } catch (err) {
        const el = root.querySelector("#sub_err");
        el.textContent = err.message;
        el.hidden = false;
      }
    };
  }

  root.querySelector("#sub_logout").onclick = () => logout();
}
