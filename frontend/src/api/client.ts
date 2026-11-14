const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("aina_token");
}

export function setToken(token: string) {
  localStorage.setItem("aina_token", token);
}

export function clearToken() {
  localStorage.removeItem("aina_token");
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Не авторизован");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data as T;
}

// ─── Auth ───
export const api = {
  register: (email: string, password: string, name?: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getMe: () => request("/auth/me"),
  updateMe: (data: any) => request("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
  deleteMe: () => request("/auth/me", { method: "DELETE" }),

  // ─── Questionnaire ───
  getQuestionnaire: () => request("/questionnaire"),
  saveQuestionnaire: (data: any) => request("/questionnaire", { method: "PUT", body: JSON.stringify(data) }),

  // ─── Fridge ───
  getFridge: () => request("/fridge"),
  addFridgeItem: (data: any) => request("/fridge", { method: "POST", body: JSON.stringify(data) }),
  updateFridgeItem: (id: string, data: any) => request(`/fridge/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFridgeItem: (id: string) => request(`/fridge/${id}`, { method: "DELETE" }),

  // ─── Food ───
  getFoods: (q?: string, category?: string) =>
    request(`/food${q || category ? `?${q ? `q=${q}&` : ""}${category ? `category=${category}` : ""}` : ""}`),
  getCategories: () => request("/food/categories"),
  getRecipes: (mealType?: string) => request(`/food/recipes${mealType ? `?mealType=${mealType}` : ""}`),

  // ─── Menu ───
  generateMenu: (data: any) => request("/menu/generate", { method: "POST", body: JSON.stringify(data) }),
  saveMenu: (menus: any[]) => request("/menu/save", { method: "POST", body: JSON.stringify({ menus }) }),
  getMenus: () => request("/menu"),
  getMenu: (id: string) => request(`/menu/${id}`),
  deleteMenu: (id: string) => request(`/menu/${id}`, { method: "DELETE" }),
  replaceDish: (data: any) => request("/menu/replace", { method: "POST", body: JSON.stringify(data) }),
  getCalc: () => request("/menu/calc"),

  // ─── Subscription ───
  getPlans: () => request("/subscription/plans"),
  getSubStatus: () => request("/subscription/status"),
  checkout: (planCode: string) => request("/subscription/checkout", { method: "POST", body: JSON.stringify({ planCode }) }),
  cancelSub: () => request("/subscription/cancel", { method: "POST" }),
  getPayments: () => request("/subscription/payments"),

  // ─── Admin ───
  getAdminStats: () => request("/admin/stats"),
  getAdminUsers: (page?: number) => request(`/admin/users${page ? `?page=${page}` : ""}`),
  getAdminPayments: () => request("/admin/payments"),
  getAdminPlans: () => request("/admin/plans"),
  updatePlan: (code: string, data: any) => request(`/admin/plans/${code}`, { method: "PUT", body: JSON.stringify(data) }),
};
