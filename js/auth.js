// Авторизация: настоящая регистрация/вход через backend (JWT).
// Подписка (Stripe) будет добавлена позже — пока все функции доступны
// аутентифицированным пользователям.
import { api } from "./api.js";
import { loadFromBackend } from "./store.js";

const authListeners = new Set();
function notifyAuth() { authListeners.forEach((fn) => fn()); }

export function subscribeAuth(fn) { authListeners.add(fn); return () => authListeners.delete(fn); }

export function isAuthenticated() { return !!api.getToken(); }
export function getCurrentUser() { return api.getUser(); }

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
  notifyAuth();
}

// Админ-режим (заглушка — будет настроен позже)
let _adminMode = false;
export function adminMode() { return _adminMode; }
export function enterAdminMode() { _adminMode = true; notifyAuth(); }
export function exitAdminMode() { _adminMode = false; notifyAuth(); }
