// Экран входа/регистрации: настоящая авторизация через backend (JWT).
import { api } from "../api.js";
import { loginSuccess } from "../auth.js";
import { esc } from "../ui.js";

export function renderAuth(root) {
  root.innerHTML = `
    <section class="paywall">
      <div class="pw-card">
        <div class="pw-brand"><span class="mark">A</span> Aina <em>évidence</em></div>
        <div class="pw-subtitle">Персональный конструктор меню</div>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Вход</button>
          <button class="auth-tab" data-tab="register">Регистрация</button>
          <button class="auth-tab" data-tab="reset">Восстановление</button>
        </div>

        <form id="auth_login" class="auth-form">
          <label>Email
            <input type="email" id="li_email" required placeholder="you@example.com" autocomplete="email">
          </label>
          <label>Пароль
            <input type="password" id="li_pass" required minlength="6" autocomplete="current-password">
          </label>
          <button type="submit" class="btn primary">Войти</button>
          <p id="li_err" class="pw-err" hidden></p>
        </form>

        <form id="auth_register" class="auth-form" hidden>
          <label>Имя
            <input type="text" id="rg_name" placeholder="например, Анна" autocomplete="name">
          </label>
          <label>Email
            <input type="email" id="rg_email" required placeholder="you@example.com" autocomplete="email">
          </label>
          <label>Пароль
            <input type="password" id="rg_pass" required minlength="6" placeholder="минимум 6 символов" autocomplete="new-password">
          </label>
          <button type="submit" class="btn primary">Создать аккаунт</button>
          <p id="rg_err" class="pw-err" hidden></p>
        </form>

        <form id="auth_reset" class="auth-form" hidden>
          <label>Email
            <input type="email" id="rs_email" required placeholder="you@example.com" autocomplete="email">
          </label>
          <label>Новый пароль
            <input type="password" id="rs_pass" required minlength="6" placeholder="минимум 6 символов" autocomplete="new-password">
          </label>
          <button type="submit" class="btn primary">Сбросить пароль</button>
          <p id="rs_msg" class="pw-err" hidden></p>
          <p class="hint">Введите email и новый пароль. Пароль будет обновлён сразу.</p>
        </form>

        <p class="auth-hint">После регистрации вы получите доступ к конструктору меню.</p>
      </div>
    </section>`;

  root.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.onclick = () => {
      root.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      root.querySelector("#auth_login").hidden = target !== "login";
      root.querySelector("#auth_register").hidden = target !== "register";
      root.querySelector("#auth_reset").hidden = target !== "reset";
    };
  });

  // Вход
  const liForm = root.querySelector("#auth_login");
  const liErr = root.querySelector("#li_err");
  liForm.onsubmit = async (e) => {
    e.preventDefault();
    liErr.hidden = true;
    const email = root.querySelector("#li_email").value;
    const password = root.querySelector("#li_pass").value;
    try {
      const res = await api.login(email, password);
      await loginSuccess(res);
    } catch (err) {
      liErr.textContent = err.message;
      liErr.hidden = false;
    }
  };

  // Регистрация
  const rgForm = root.querySelector("#auth_register");
  const rgErr = root.querySelector("#rg_err");
  rgForm.onsubmit = async (e) => {
    e.preventDefault();
    rgErr.hidden = true;
    const name = root.querySelector("#rg_name").value;
    const email = root.querySelector("#rg_email").value;
    const password = root.querySelector("#rg_pass").value;
    try {
      const res = await api.register(email, password, name);
      await loginSuccess(res);
    } catch (err) {
      rgErr.textContent = err.message;
      rgErr.hidden = false;
    }
  };

  // Восстановление пароля
  const rsForm = root.querySelector("#auth_reset");
  const rsMsg = root.querySelector("#rs_msg");
  rsForm.onsubmit = async (e) => {
    e.preventDefault();
    rsMsg.hidden = true;
    const email = root.querySelector("#rs_email").value;
    const password = root.querySelector("#rs_pass").value;
    try {
      const res = await api.resetPassword(email, password);
      rsMsg.textContent = res.message || "Пароль обновлён. Войдите с новым паролем.";
      rsMsg.style.color = "var(--accent)";
      rsMsg.hidden = false;
    } catch (err) {
      rsMsg.textContent = err.message;
      rsMsg.style.color = "";
      rsMsg.hidden = false;
    }
  };
}
