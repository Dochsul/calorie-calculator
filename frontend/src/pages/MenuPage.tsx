import { useEffect, useState } from "react";
import { api } from "../api/client";

const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

export default function MenuPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savedMenus, setSavedMenus] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMenus().then(setSavedMenus).catch(() => {});
  }, []);

  const generate = async (days: number = 1, useFridge: boolean = false) => {
    setGenerating(true);
    try {
      const result = await api.generateMenu({ days, useFridge });
      setMenus(result);
      setShowHistory(false);
    } catch (err: any) {
      alert(err.message || "Ошибка генерации меню");
    } finally {
      setGenerating(false);
    }
  };

  const replaceDish = async (menuIndex: number, mealIndex: number, simpler: boolean = false, fromFridge: boolean = false) => {
    const key = `${menuIndex}-${mealIndex}`;
    setReplacing(key);
    try {
      const newMeal = await api.replaceDish({ menuIndex, mealIndex, simpler, fromFridge });
      const newMenus = [...menus];
      newMenus[menuIndex].meals[mealIndex] = newMeal;
      // Пересчёт дневного итога
      const dayTotal = newMenus[menuIndex].meals.reduce((acc, m) => ({
        kcal: acc.kcal + m.nutrition.kcal,
        protein: acc.protein + m.nutrition.protein,
        fat: acc.fat + m.nutrition.fat,
        carbs: acc.carbs + m.nutrition.carbs,
        cookedMass: acc.cookedMass + m.nutrition.cookedMass,
        rawMass: acc.rawMass + m.nutrition.rawMass,
      }), { kcal: 0, protein: 0, fat: 0, carbs: 0, cookedMass: 0, rawMass: 0 });
      newMenus[menuIndex].dayTotal = dayTotal;
      setMenus(newMenus);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplacing(null);
    }
  };

  const saveMenus = async () => {
    setSaving(true);
    try {
      await api.saveMenu(menus);
      const updated = await api.getMenus();
      setSavedMenus(updated);
      alert("Меню сохранено!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">🍽️ Моё меню</h1>

      <div className="card">
        <h2>Составить меню</h2>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>
          Нажмите кнопку, чтобы получить персональное меню с точным расчётом КБЖУ.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary lg" onClick={() => generate(1)} disabled={generating}>
            {generating ? "⏳ Составление…" : "✨ Составить меню на завтра"}
          </button>
          <button className="btn" onClick={() => generate(7)} disabled={generating}>План на 7 дней</button>
          <button className="btn" onClick={() => generate(1, true)} disabled={generating}>🧊 Приготовить из того, что есть</button>
        </div>
      </div>

      {menus.length > 0 && (
        <>
          {menus.map((menu, di) => (
            <div key={di} className="card menu-day">
              <div className="menu-day-head">
                <h3>{dayNames[new Date(menu.date).getDay()]} — {new Date(menu.date).toLocaleDateString("ru-RU")}</h3>
                <span className="total">{Math.round(menu.dayTotal.kcal)} / {menu.targetCalories} ккал</span>
              </div>

              {menu.warnings?.map((w: string, i: number) => (
                <div key={i} className="alert warning" style={{ margin: "0 0 12px" }}>⚠️ {w}</div>
              ))}

              <div className="meal-grid">
                {menu.meals.map((meal: any, mi: number) => (
                  <div key={mi} className="meal-card">
                    <div className="head">
                      <span className="name">{meal.mealName}</span>
                    </div>
                    <div className="dish-name">{meal.recipeName}</div>
                    <ul className="ingredients">
                      {meal.ingredients.map((ing: any, ii: number) => (
                        <li key={ii}>{ing.name} — {Math.round(ing.grams)} г</li>
                      ))}
                    </ul>
                    <div className="nutrition">
                      <span>{Math.round(meal.nutrition.kcal)} ккал</span>
                      <span>Б {Math.round(meal.nutrition.protein)}</span>
                      <span>Ж {Math.round(meal.nutrition.fat)}</span>
                      <span>У {Math.round(meal.nutrition.carbs)}</span>
                      <span>Готово: {Math.round(meal.nutrition.cookedMass)} г</span>
                    </div>
                    {meal.steps && meal.steps.length > 0 && (
                      <div className="steps">
                        <ol>
                          {meal.steps.map((s: string, si: number) => <li key={si}>{s}</li>)}
                        </ol>
                      </div>
                    )}
                    <div className="actions">
                      <button
                        className="btn sm"
                        onClick={() => replaceDish(di, mi)}
                        disabled={replacing === `${di}-${mi}`}
                      >
                        {replacing === `${di}-${mi}` ? "…" : "🔄 Заменить"}
                      </button>
                      <button className="btn sm" onClick={() => replaceDish(di, mi, true)}>⚡ Быстрее</button>
                      <button className="btn sm" onClick={() => replaceDish(di, mi, false, true)}>🧊 Из холодильника</button>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                      Время: {meal.prepTime + meal.cookTime} мин · Сложность: {meal.difficulty === "easy" ? "просто" : meal.difficulty === "medium" ? "средне" : "сложно"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="day-total-bar">
                <div className="bar">
                  <div style={{ width: `${Math.min(100, (menu.dayTotal.kcal / menu.targetCalories) * 100)}%`, background: menu.dayTotal.kcal > menu.targetCalories * 1.1 ? "var(--danger)" : menu.dayTotal.kcal < menu.targetCalories * 0.85 ? "var(--gold)" : "var(--accent)" }} />
                </div>
                <div className="day-total-nums">
                  Итог: <b>{Math.round(menu.dayTotal.kcal)} ккал</b> · Б {Math.round(menu.dayTotal.protein)} · Ж {Math.round(menu.dayTotal.fat)} · У {Math.round(menu.dayTotal.carbs)} г
                </div>
              </div>
            </div>
          ))}

          <button className="btn primary block lg" onClick={saveMenus} disabled={saving}>
            {saving ? "Сохранение…" : "💾 Сохранить меню"}
          </button>
        </>
      )}

      {savedMenus.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ cursor: "pointer" }} onClick={() => setShowHistory(!showHistory)}>
            📚 История меню ({savedMenus.length}) {showHistory ? "▲" : "▼"}
          </h2>
          {showHistory && (
            <div>
              {savedMenus.map((m) => (
                <div key={m.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <b>{new Date(m.date).toLocaleDateString("ru-RU")}</b>
                      <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>
                        {Array.isArray(m.menuData) ? `${m.menuData.length} дн.` : "1 день"}
                      </span>
                    </div>
                    <button className="btn sm danger" onClick={async () => {
                      await api.deleteMenu(m.id);
                      setSavedMenus(savedMenus.filter((x) => x.id !== m.id));
                    }}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
