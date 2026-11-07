// Подписка по кодам доступа: генерация, проверка, активация, режим администратора.
// Модель: владелец получает оплату вручную (например, переводом на Сбербанк),
// генерирует индивидуальный код и отправляет его клиенту. Клиент вводит код при входе —
// приложение открывается на срок подписки. Работает без backend и платёжного API.
import { ADMIN_PIN } from "./config.js";

const SUB_KEY = "aina_subscription";
const CODES_KEY = "aina_access_codes"; // журнал сгенерированных кодов (только у админа)
const TRIAL_KEY = "aina_trial_used";   // флаг: пробный период уже использован
const PLAN_KEY = "aina_selected_plan";   // выбранный пользователем тариф
const ADMIN_SESSION = "aina_admin_session";
const DAY_MS = 86400000;
const SALT = "aina-evidence-2026";
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O/1/I — читаемость

// --- Подписка ---
export function getSubscription() {
  try { return JSON.parse(localStorage.getItem(SUB_KEY)) || { until: 0 }; }
  catch { return { until: 0 }; }
}
export function isActive() { return getSubscription().until > Date.now(); }
function saveSub(s) { localStorage.setItem(SUB_KEY, JSON.stringify(s)); }

// --- Подписчики на изменение доступа (оплата/админка) ---
const authListeners = new Set();
function notifyAuth() { authListeners.forEach((fn) => fn()); }
export function subscribeAuth(fn) { authListeners.add(fn); return () => authListeners.delete(fn); }

// --- Выбор тарифного плана ---
export function getSelectedPlan() {
  try { return JSON.parse(localStorage.getItem(PLAN_KEY)) || null; }
  catch { return null; }
}
export function selectPlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify({ days: plan.days, label: plan.label, price: plan.price }));
}

// --- Пробный период (3 дня бесплатно, один раз) ---
export function isTrialUsed() { return localStorage.getItem(TRIAL_KEY) === "1"; }
export function startTrial() {
  if (isTrialUsed()) return { ok: false, error: "Пробный период уже использован" };
  const now = Date.now();
  const until = now + 3 * DAY_MS;
  saveSub({ until, trial: true });
  localStorage.setItem(TRIAL_KEY, "1");
  notifyAuth();
  return { ok: true, until };
}

// --- Мягкая подпись кода (djb2-подобный хеш). Не криптостойко — см. README. ---
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36).toUpperCase();
}
function checksum(days, token) {
  return hashStr(days + "|" + token + "|" + SALT).slice(0, 4).padEnd(4, "0");
}
function rndToken(n) {
  let t = "";
  for (let i = 0; i < n; i++) t += ALPH[Math.floor(Math.random() * ALPH.length)];
  return t;
}

// --- Генерация кода: AINA-<дней>D-<токен>-<контрольная сумма> ---
export function makeCode(days) {
  const token = rndToken(6);
  return `AINA-${days}D-${token}-${checksum(days, token)}`;
}

// --- Проверка кода ---
export function validateCode(code) {
  const c = String(code || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = /^AINA-(\d{1,4})D-([A-Z2-9]{6})-([0-9A-Z]{4})$/.exec(c);
  if (!m) return { ok: false, error: "Неверный формат кода" };
  const days = parseInt(m[1], 10), token = m[2], chk = m[3];
  if (!Number.isFinite(days) || days < 1 || days > 3650) return { ok: false, error: "Неверный срок действия" };
  if (checksum(days, token) !== chk) return { ok: false, error: "Код недействителен" };
  return { ok: true, days };
}

// --- Активация кода клиентом: продлевает подписку от текущего конца (если активна) ---
export function activateCode(code) {
  const v = validateCode(code);
  if (!v.ok) return v;
  const now = Date.now();
  const cur = getSubscription();
  const base = cur.until && cur.until > now ? cur.until : now;
  const until = base + v.days * DAY_MS;
  saveSub({ until });
  notifyAuth();
  return { ok: true, until };
}

// --- Журнал кодов (локальный учёт у администратора) ---
function loadCodes() {
  try { return JSON.parse(localStorage.getItem(CODES_KEY)) || []; }
  catch { return []; }
}
function saveCodes(list) { localStorage.setItem(CODES_KEY, JSON.stringify(list)); }
export function getCodes() { return loadCodes(); }
export function addCodes(made) {
  const list = loadCodes();
  for (const c of made) list.unshift({ code: c.code, days: c.days, created: c.created });
  saveCodes(list);
  return loadCodes();
}

// --- Режим администратора ---
let _adminMode = false; // показ экрана администратора
export function adminMode() { return _adminMode; }
export function enterAdminMode() { _adminMode = true; notifyAuth(); }
export function exitAdminMode() { _adminMode = false; notifyAuth(); }
export function adminUnlocked() { return sessionStorage.getItem(ADMIN_SESSION) === "1"; }
export function unlockAdmin(pin) {
  if (pin === ADMIN_PIN) { sessionStorage.setItem(ADMIN_SESSION, "1"); notifyAuth(); return true; }
  return false;
}
