import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function ShoppingList() {
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [list, setList] = useState<Record<string, { name: string; grams: number; category: string }[]>>({});

  useEffect(() => {
    api.getMenus().then((m) => {
      setMenus(m);
      if (m.length > 0) selectMenu(m[0]);
    }).catch(() => {});
  }, []);

  const selectMenu = (menu: any) => {
    setSelectedMenu(menu);
    const menuData = Array.isArray(menu.menuData) ? menu.menuData : [menu.menuData];
    const grouped: Record<string, { name: string; grams: number; category: string }[]> = {};

    for (const day of menuData) {
      if (!day.meals) continue;
      for (const meal of day.meals) {
        if (!meal.ingredients) continue;
        for (const ing of meal.ingredients) {
          // Простой список — категория неизвестна, группируем по "прочее"
          const cat = "Все продукты";
          if (!grouped[cat]) grouped[cat] = [];
          const existing = grouped[cat].find((x) => x.name === ing.name);
          if (existing) {
            existing.grams += ing.grams;
          } else {
            grouped[cat].push({ name: ing.name, grams: ing.grams, category: cat });
          }
        }
      }
    }

    // Сортируем по имени
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }

    setList(grouped);
  };

  return (
    <div>
      <h1 className="page-title">🛒 Список покупок</h1>

      {menus.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)", fontStyle: "italic" }}>
            Нет сохранённых меню. Сначала составьте и сохраните меню на вкладке «Моё меню».
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="form-group">
              <label>Выберите меню</label>
              <select value={selectedMenu?.id || ""} onChange={(e) => {
                const m = menus.find((x) => x.id === e.target.value);
                if (m) selectMenu(m);
              }}>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {new Date(m.date).toLocaleDateString("ru-RU")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {Object.keys(list).length > 0 && (
            <div className="card">
              <h2>Список продуктов</h2>
              {Object.entries(list).map(([cat, items]) => (
                <div key={cat}>
                  <h3>{cat} ({items.length})</h3>
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {items.map((item, i) => (
                      <li key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "8px 0", borderBottom: "1px solid var(--line)"
                      }}>
                        <span>{item.name}</span>
                        <b style={{ color: "var(--gold)" }}>{Math.round(item.grams)} г</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
