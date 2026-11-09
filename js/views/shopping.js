// Вкладка «Покупки»: агрегированный список покупок по меню, сгруппированный по категориям.
import { getState, targetCalories } from "../store.js";
import { PRODUCT_MAP } from "../data.js";
import { esc } from "../ui.js";
import { exportPDF } from "../pdf.js";
import { checkMenu, isMedical } from "../dietary.js";

export function renderShopping(root) {
  const s = getState();
  const agg = {};
  for (const day of s.menu.days) {
    for (const meal of day.meals) {
      const dish = s.dishes.find((d) => d.id === meal.dishId);
      if (!dish) continue;
      const serv = parseFloat(meal.servings) || 1;
      for (const ing of dish.ingredients || []) {
        const g = (parseFloat(ing.grams) || 0) * serv;
        agg[ing.productId] = (agg[ing.productId] || 0) + g;
      }
    }
  }

  const byCat = {};
  for (const [pid, g] of Object.entries(agg)) {
    const pr = PRODUCT_MAP[pid];
    if (!pr) continue;
    (byCat[pr.cat] = byCat[pr.cat] || []).push({ pr, g });
  }

  const groups = Object.entries(byCat).map(([cat, items]) => `
    <div class="shop-group">
      <h3>${esc(cat)} <span>${items.length}</span></h3>
      <ul>${items.sort((a, b) => b.g - a.g).map((x) => `<li><span>${esc(x.pr.name)}</span><b>${Math.round(x.g)} г</b></li>`).join("")}</ul>
    </div>`).join("");

  const dietaryBanner = isMedical(s.restrictions)
    ? (() => {
        const { violations, unknown } = checkMenu(s);
        if (violations.length) {
          return `<div class="dc-warn dc-warn-block">⚠ Нарушения в меню (${violations.length}): ${violations.map((v) => esc(v.dishName + " — " + v.reason)).join("; ")}. PDF-экспорт заблокирован.</div>`;
        }
        if (unknown.length) {
          return `<div class="dc-warn dc-warn-unknown">⚠ Неизвестный состав (${unknown.length}): ${unknown.map((u) => esc(u.dishName)).join("; ")}. Подтвердите безопасность в редакторе блюд.</div>`;
        }
        return `<div class="dc-warn ing-warn-confirmed">✓ Меню соответствует медицинским ограничениям</div>`;
      })()
    : "";

  root.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>Список покупок</h2>
        <button class="btn primary" id="shop_pdf">Экспорт меню в PDF</button>
      </div>
      ${dietaryBanner}
      ${groups ? `<div class="shop-grid">${groups}</div>` : "<p class='hint'>Соберите меню на вкладке «Меню», и список покупок появится здесь.</p>"}
    </section>`;
  root.querySelector("#shop_pdf").onclick = () => exportPDF();
}
