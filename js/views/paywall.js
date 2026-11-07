// Экран оплаты/входа: показывается, пока нет активной подписки.
import { activateCode, enterAdminMode, startTrial, isTrialUsed } from "../auth.js";
import { PAYMENT, PLANS, TRIAL_DAYS } from "../config.js";
import { esc } from "../ui.js";

export function renderPaywall(root) {
  const recip = PAYMENT.recipient ? `, ${esc(PAYMENT.recipient)}` : "";
  const trialAvailable = !isTrialUsed();

  root.innerHTML = `
    <section class="paywall">
      <div class="pw-card">
        <div class="pw-brand"><span class="mark">A</span> Aina <em>évidence</em></div>
        <div class="pw-subtitle">Персональный конструктор меню</div>
        <h1 class="pw-title">Доступ к конструктору меню</h1>
        <p class="pw-sub">Персональное меню любой сложности: расчёт КБЖУ, меню по дням, замены продуктов, список покупок и экспорт в PDF.</p>

        ${trialAvailable ? `
          <div class="pw-trial">
            <div class="pw-trial-badge">${TRIAL_DAYS} дня бесплатно</div>
            <p class="pw-trial-text">Попробуйте все возможности конструктора без оплаты — полный доступ на ${TRIAL_DAYS} дня.</p>
            <button id="pw_trial" class="btn primary pw-trial-btn" type="button">Начать пробный период</button>
          </div>
        ` : ""}

        <div class="pw-plans-label">Тарифы</div>
        <div class="pw-plans">
          ${PLANS.map((p, i) => `
            <div class="pw-plan ${i === 1 ? "pw-plan-popular" : ""}">
              ${p.save ? `<div class="pw-plan-badge">${esc(p.save)}</div>` : ""}
              <div class="pw-plan-name">${esc(p.label)}</div>
              <div class="pw-plan-price">${esc(p.price)} ₽</div>
              <div class="pw-plan-per">${esc(p.perMonth)}</div>
            </div>
          `).join("")}
        </div>

        <div class="pw-steps">
          <div class="pw-step"><b>1.</b> Оплатите подписку — ${esc(PAYMENT.method)}${recip}: <span class="pw-requis">${esc(PAYMENT.details)}</span></div>
          <div class="pw-step"><b>2.</b> Пришлите чек администратору — вы получите индивидуальный код доступа.</div>
          <div class="pw-step"><b>3.</b> Введите код ниже, чтобы открыть приложение.</div>
        </div>
        ${PAYMENT.note ? `<p class="pw-note">${esc(PAYMENT.note)}</p>` : ""}

        <form id="pw_form" class="pw-form" autocomplete="off">
          <label>Код доступа
            <input id="pw_code" type="text" placeholder="AINA-30D-XXXXXX-XXXX" autocomplete="off" spellcheck="false">
          </label>
          <button type="submit" class="btn primary">Открыть доступ</button>
          <p id="pw_err" class="pw-err" hidden></p>
        </form>

        <button id="pw_admin" class="pw-admin" type="button">Вход для администратора</button>
      </div>
    </section>`;

  const form = root.querySelector("#pw_form");
  const err = root.querySelector("#pw_err");
  form.onsubmit = (e) => {
    e.preventDefault();
    const res = activateCode(root.querySelector("#pw_code").value);
    if (!res.ok) {
      err.textContent = res.error;
      err.hidden = false;
    }
    // при успехе activateCode уже вызвал notifyAuth → приложение переключится на основной интерфейс
  };

  const trialBtn = root.querySelector("#pw_trial");
  if (trialBtn) {
    trialBtn.onclick = () => {
      const res = startTrial();
      if (!res.ok) {
        err.textContent = res.error;
        err.hidden = false;
      }
      // при успехе startTrial вызвал notifyAuth → приложение откроется
    };
  }

  root.querySelector("#pw_admin").onclick = () => enterAdminMode();
}
