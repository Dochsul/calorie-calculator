// Вкладка «Продукты дома»: выбор продуктов, которые есть дома.
// Источник для автогенерации меню.
import { getState, update } from "../store.js";
import { PRODUCTS, CATEGORIES, allowedProducts } from "../data.js";
import { esc } from "../ui.js";

export function renderPantry(root) {
  const s = getState();
  const pantry = s.pantry || { productIds: [] };
  const selected = new Set(pantry.productIds || []);
  const allowed = allowedProducts(s.restrictions);

  const groups = CATEGORIES.map((cat) => {
    const items = allowed.filter((p) => p.cat === cat);
    if (!items.length) return "";
    return `<div class="pantry-group">
      <h3>${esc(cat)}</h3>
      <div class="pantry-items">
        ${items
          .map(
            (p) => `<label class="pantry-chip ${selected.has(p.id) ? "checked" : ""}">
          <input type="checkbox" value="${p.id}" ${selected.has(p.id) ? "checked" : ""}>
          <span>${esc(p.name)}</span>
          <small>${p.kcal} ккал</small>
        </label>`
          )
          .join("")}
      </div>
    </div>`;
  }).join("");

  const count = selected.size;

  root.innerHTML = `
    <section class="card">
      <div class="card-head">
        <h2>Продукты дома</h2>
        <span class="hint">Отмечено: ${count}</span>
      </div>
      <p class="hint">Отметьте продукты, которые у вас есть. На их основе будет составлено меню.</p>
      <div class="pantry-actions">
        <button class="btn sm" id="pan_clear">Снять все</button>
        <button class="btn sm primary" id="pan_common">Отметить основные</button>
      </div>
      ${groups || "<p class='hint'>Нет доступных продуктов.</p>"}
    </section>`;

  // Обновление чекбоксов
  root.querySelectorAll(".pantry-chip input").forEach((cb) => {
    cb.onchange = () => {
      const id = cb.value;
      update((st) => {
        if (!st.pantry) st.pantry = { productIds: [] };
        const set = new Set(st.pantry.productIds);
        if (cb.checked) set.add(id);
        else set.delete(id);
        st.pantry.productIds = [...set];
      });
      cb.closest(".pantry-chip").classList.toggle("checked", cb.checked);
      const n = root.querySelectorAll(".pantry-chip input:checked").length;
      root.querySelector(".card-head .hint").textContent = "Отмечено: " + n;
    };
  });

  root.querySelector("#pan_clear").onclick = () => {
    update((st) => { st.pantry = { productIds: [] }; });
    renderPantry(root);
  };

  root.querySelector("#pan_common").onclick = () => {
    const common = [
      "rice_white", "buckwheat", "oats", "pasta",
      "chicken_breast", "egg", "cod", "turkey",
      "curd_5", "milk_25", "kefir_1", "cheese_hard",
      "potato", "cucumber", "tomato", "carrot", "cabbage", "onion",
      "apple", "banana",
      "olive_oil", "oil_sunflower", "butter",
      "bread_rye",
    ];
    update((st) => { st.pantry = { productIds: common }; });
    renderPantry(root);
  };
}
