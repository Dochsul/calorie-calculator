// API-клиент для backend Aina Évidence.
// Все запросы идут на относительный путь /api/... (тот же порт, что и фронтенд).

const TOKEN_KEY = "aina_token";
const USER_KEY = "aina_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}
function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function apiCall(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("aina-logout"));
    throw new Error("Не авторизован");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

export const api = {
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  register: (email, password, name) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email, password) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  resetPassword: (email, newPassword) =>
    apiCall("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, newPassword }),
    }),
  getState: () => apiCall("/state"),
  saveState: (data) =>
    apiCall("/state", { method: "PUT", body: JSON.stringify(data) }),

  // Подписки
  getSubscriptionStatus: () => apiCall("/subscriptions/status"),
  createCheckout: (planId, successUrl, cancelUrl) =>
    apiCall("/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ planId, successUrl, cancelUrl }),
    }),
  cancelSubscription: () =>
    apiCall("/subscriptions/cancel", { method: "POST" }),

  // Публичные тарифы
  getPlans: () => apiCall("/admin/plans"),

  // Админ
  getAdminStats: () => apiCall("/admin/stats"),
  getAdminSettings: () => apiCall("/admin/settings"),
  updatePlans: (plans) =>
    apiCall("/admin/plans", { method: "PUT", body: JSON.stringify({ plans }) }),
  updateInitFee: (initFee) =>
    apiCall("/admin/init-fee", { method: "PUT", body: JSON.stringify({ initFee }) }),
  updateFreeFeatures: (freeFeatures) =>
    apiCall("/admin/free-features", {
      method: "PUT",
      body: JSON.stringify({ freeFeatures }),
    }),
};
