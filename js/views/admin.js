// Панель администратора: генерация индивидуальных кодов доступа для клиентов.
import { adminUnlocked, unlockAdmin, makeCode, addCodes, getCodes, exitAdminMode } from "../auth.js";

const DURATIONS = [
  { days: 30, label: "30 дней (1 месяц)" },
  { days: 90, label: "90 дней (3 месяца)" },
  { days: 365, label: "365 дней (1 год)" },
];
let _lastGen = null; // последние сгенерированные коды (для показа/копирования)

export function renderAdmin(root) {
  if (!adminUnlocked()) { renderLogin(root); return; }
  renderPanel(root);
}

function renderLogin(root) {
  root.innerHTML = `
    <section class="card adm-login">
      <div class="card-head"><h2>Вход для администратора</h2></div>
      <form id="adm_login" autocomplete="off">
        <label>PIN-код
          <input id="adm_pin" type="password" inputmode="numeric" autocomplete="off">
        </label>
        <button type="submit" class="btn primary">Войти</button>
        <p id="adm_err" class="pw-err" hidden>Неверный PIN-код</p>
      </form>
      <button id="adm_back" class="btn sm adm-back" type="button">Назад</button>
    </section>`;
  const form = root.querySelector("#adm_login");
  form.onsubmit = (e) => {
    e.preventDefault();
    if (!unlockAdmin(root.querySelector("#adm_pin").value)) {
      root.querySelector("#adm_err").hidden = false;
    }
  };
  root.querySelector("#adm_back").onclick = () => exitAdminMode();
}

function renderPanel(root) {
  const codes = getCodes();
  root.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>Панель администратора</h2>
        <button id="adm_exit" class="btn sm">Выйти</button>
      </div>
      <p class="hint">Сгенерируйте индивидуальные коды и отправьте каждому клиенту отдельно. Код открывает приложение на выбранный срок с момента ввода клиентом.</p>

      <div class="adm-gen">
        <label>Срок подписки
          <select id="adm_days">${DURATIONS.map((d) => `<option value="${d.days}">${d.label}</option>`).join("")}</select>
        </label>
        <label>Сколько кодов
          <select id="adm_count">${[1, 5, 10, 25, 50].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>${n}</option>`).join("")}</select>
        </label>
        <button id="adm_gen" class="btn primary">Сгенерировать</button>
      </div>

      ${_lastGen && _lastGen.length ? `
        <div class="adm-new">
          <div class="adm-new-title">Новые коды — скопируйте и отправьте клиентам:</div>
          <textarea id="adm_newcodes" readonly>${_lastGen.join("\n")}</textarea>
          <button id="adm_copynew" class="btn sm">Скопировать новые</button>
        </div>` : ""}

      <h3 class="adm-journal-head">Журнал кодов (${codes.length})</h3>
      ${codes.length ? `
        <button id="adm_copyall" class="btn sm adm-copyall">Скопировать все</button>
        <div class="adm-list">
          ${codes.map((c) => `<div class="adm-row"><code>${c.code}</code><span class="adm-days">${c.days} дн.</span><span class="adm-date">${new Date(c.created).toLocaleDateString("ru-RU")}</span><button class="btn sm adm-copy" data-code="${c.code}">Копировать</button></div>`).join("")}
        </div>` : "<p class='hint'>Пока нет сгенерированных кодов.</p>"}
    </section>`;

  root.querySelector("#adm_exit").onclick = () => exitAdminMode();
  root.querySelector("#adm_gen").onclick = () => {
    const days = parseInt(root.querySelector("#adm_days").value, 10);
    const count = parseInt(root.querySelector("#adm_count").value, 10);
    const created = Date.now();
    const made = Array.from({ length: count }, () => ({ code: makeCode(days), days, created }));
    addCodes(made);
    _lastGen = made.map((c) => c.code);
    renderPanel(root);
  };
  const copyNew = root.querySelector("#adm_copynew");
  if (copyNew) copyNew.onclick = () => copyText(root.querySelector("#adm_newcodes").value);
  const copyAll = root.querySelector("#adm_copyall");
  if (copyAll) copyAll.onclick = () => copyText(getCodes().map((c) => c.code).join("\n"));
  root.querySelectorAll(".adm-copy").forEach((b) => (b.onclick = () => copyText(b.dataset.code)));
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return; } catch {}
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch {}
  ta.remove();
}
