// Управление темой оформления (светлая / тёмная) с сохранением выбора.
const KEY = "aina-theme";

export function currentTheme() {
  return document.documentElement.dataset.theme || "light";
}

export function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(KEY, next);
  updateBtn();
}

export function updateBtn() {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = currentTheme() === "dark" ? "☀" : "☾";
}
