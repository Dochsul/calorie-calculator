// Авторизация: настоящая регистрация/вход через backend (JWT).
// Проверка подписки через backend.
import { api } from "./api.js";
import { loadFromBackend } from "./store.js";

const authListeners = new Set();
function notifyAuth() { authListeners.forEach((fn) => fn()); }

export function subscribeAuth(fn) { authListeners.add(fn); return () => authListeners.delete(fn); }

export function isAuthenticated() { return !!api.getToken(); }
export function getCurrentUser() { return api.getUser(); }
export function isAdmin() { return !!api.getUser()?.isAdmin; }

let _subStatus = null;

// Проверка активной подписки
export async function checkSubscription() {
  if (!isAuthenticated()) return { active: false, subscription: null, payments: [] };
  try {
    const data = await api.getSubscriptionStatus();
    _subStatus = data;
    return {
      active: data.subscription?.status === "active",
      subscription: data.subscription,
      payments: data.payments || [],
    };
  } catch {
    return { active: false, subscription: null, payments: [] };
  }
}

export function getSubStatus() { return _subStatus; }

// Бесплатные функции доступны без подписки
export async function hasAccess(feature) {
  if (!isAuthenticated()) return false;
  // Пока нет Stripe — все аутентифицированные пользователи имеют доступ
  const sub = await checkSubscription();
  if (sub.active) return true;

  // Проверяем бесплатные функции
  try {
    const plans = await api.getPlans();
    const free = plans.freeFeatures || {};
    if (free[feature]) return true;
  } catch {}

  // Временно: если Stripe не настроен, даём доступ всем авторизованным
  return true;
}

export function isActive() { return isAuthenticated(); }

// Успешный вход/регистрация: сохранить токен, загрузить состояние, уведомить
export async function loginSuccess(res) {
  api.setToken(res.token);
  api.setUser(res.user);
  await loadFromBackend();
  notifyAuth();
}

export function logout() {
  api.clearToken();
  _subStatus = null;
  notifyAuth();
}

export function adminMode() { return isAdmin(); }
export function enterAdminMode() { /* noop — admin is role-based */ }
export function exitAdminMode() { /* noop */ }
