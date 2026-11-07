// Экран оплаты/входа: показывается, пока нет активной подписки.
import { activateCode, enterAdminMode } from "../auth.js";
import { PAYMENT } from "../config.js";
import { esc } from "../ui.js";

export function renderPaywall(root) {
  const recip = PAYMENT.recipient ? `, ${esc(PAYMENT.recipient)}` : "";
  root.innerHTML = `
    <section class="paywall">
      <div class="pw-card">
        <div class="pw-brand">Aina <em>Évidence</em></div>
        <h1 class="pw-title">Доступ к конструктору меню</h1>
        <p class="pw-sub">Персональное меню любой сложности: расчёт КБЖУ, меню по дням, замены продуктов, список покупок и экспорт в PDF.</p>

        <div class="pw-price">
          <span class="pw-amount">${esc(PAYMENT.price)} ₽</span>
          <span class="pw-period">${esc(PAYMENT.period)}</span>
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
  root.querySelector("#pw_admin").onclick = () => enterAdminMode();
}
