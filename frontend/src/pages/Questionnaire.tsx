import { useEffect, useState } from "react";
import { api } from "../api/client";

const GOALS = [
  { value: "lose_weight", icon: "📉", label: "Снижение веса" },
  { value: "maintain", icon: "⚖️", label: "Поддержание веса" },
  { value: "muscle_gain", icon: "💪", label: "Набор массы" },
  { value: "balanced", icon: "🌿", label: "Сбалансированное" },
];

const ACTIVITIES = [
  { value: "1.2", label: "Минимальная (сидячий образ жизни)" },
  { value: "1.375", label: "Лёгкая (1-3 раза в неделю)" },
  { value: "1.55", label: "Средняя (3-5 раз в неделю)" },
  { value: "1.725", label: "Высокая (6-7 раз в неделю)" },
];

export default function Questionnaire() {
  const [data, setData] = useState<any>({
    goal: "maintain",
    age: 30, height: 170, weight: 70, gender: "female",
    formula: "mifflin", activityLevel: "1.375",
    mealsPerDay: 4,
    pregnancy: false, breastfeeding: false, cycle: false,
    allergies: [], dislikedFoods: [], dietaryTags: [],
    customCalories: null, customProtein: null, customFat: null, customCarbs: null,
    notes: "",
  });
  const [calc, setCalc] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allergyInput, setAllergyInput] = useState("");

  useEffect(() => {
    api.getQuestionnaire().then((q) => {
      if (q && Object.keys(q).length > 0) setData((d: any) => ({ ...d, ...q }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.getCalc().then(setCalc).catch(() => {});
  }, [data]);

  const update = (patch: any) => { setData((d: any) => ({ ...d, ...patch })); setSaved(false); };

  const toggleDietary = (tag: string) => {
    const tags = data.dietaryTags || [];
    update({ dietaryTags: tags.includes(tag) ? tags.filter((t: string) => t !== tag) : [...tags, tag] });
  };

  const addAllergy = () => {
    if (allergyInput.trim()) {
      update({ allergies: [...(data.allergies || []), allergyInput.trim().toLowerCase()] });
      setAllergyInput("");
    }
  };

  const removeAllergy = (i: number) => {
    update({ allergies: data.allergies.filter((_: any, idx: number) => idx !== i) });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.saveQuestionnaire(data);
      setSaved(true);
    } catch (err: any) {
      alert(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Анкета питания</h1>

      <div className="card">
        <h3>Цель</h3>
        <div className="goal-grid">
          {GOALS.map((g) => (
            <div
              key={g.value}
              className={`goal-option ${data.goal === g.value ? "selected" : ""}`}
              onClick={() => update({ goal: g.value })}
            >
              <div className="icon">{g.icon}</div>
              <div className="label">{g.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Физические данные</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Пол</label>
            <select value={data.gender} onChange={(e) => update({ gender: e.target.value })}>
              <option value="female">Женщина</option>
              <option value="male">Мужчина</option>
            </select>
          </div>
          <div className="form-group">
            <label>Возраст</label>
            <input type="number" min="1" max="120" value={data.age} onChange={(e) => update({ age: parseInt(e.target.value) })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Вес, кг</label>
            <input type="number" min="20" max="400" step="0.1" value={data.weight} onChange={(e) => update({ weight: parseFloat(e.target.value) })} />
          </div>
          <div className="form-group">
            <label>Рост, см</label>
            <input type="number" min="80" max="250" value={data.height} onChange={(e) => update({ height: parseInt(e.target.value) })} />
          </div>
        </div>
        <div className="form-group">
          <label>Формула расчёта</label>
          <select value={data.formula} onChange={(e) => update({ formula: e.target.value })}>
            <option value="mifflin">Миффлина-Сан Жеора (рекомендуется)</option>
            <option value="harris">Харриса-Бенедикта</option>
          </select>
        </div>
        <div className="form-group">
          <label>Уровень активности</label>
          <select value={data.activityLevel} onChange={(e) => update({ activityLevel: e.target.value })}>
            {ACTIVITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="form-check">
          <input type="checkbox" id="preg" checked={data.pregnancy} onChange={(e) => update({ pregnancy: e.target.checked })} />
          <label htmlFor="preg">Беременность (+300 ккал)</label>
        </div>
        <div className="form-check">
          <input type="checkbox" id="bf" checked={data.breastfeeding} onChange={(e) => update({ breastfeeding: e.target.checked })} />
          <label htmlFor="bf">Грудное вскармливание (+500 ккал)</label>
        </div>
      </div>

      <div className="card">
        <h3>Режим питания</h3>
        <div className="form-group">
          <label>Количество приёмов пищи</label>
          <select value={data.mealsPerDay} onChange={(e) => update({ mealsPerDay: parseInt(e.target.value) })}>
            <option value={3}>3 приёма</option>
            <option value={4}>4 приёма</option>
            <option value={5}>5 приёмов</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Пищевые предпочтения и ограничения</h3>
        <div className="form-check">
          <input type="checkbox" id="veg" checked={data.dietaryTags?.includes("vegetarian")} onChange={() => toggleDietary("vegetarian")} />
          <label htmlFor="veg">Вегетарианское</label>
        </div>
        <div className="form-check">
          <input type="checkbox" id="vegan" checked={data.dietaryTags?.includes("vegan")} onChange={() => toggleDietary("vegan")} />
          <label htmlFor="vegan">Веганское</label>
        </div>
        <div className="form-check">
          <input type="checkbox" id="gf" checked={data.dietaryTags?.includes("glutenFree")} onChange={() => toggleDietary("glutenFree")} />
          <label htmlFor="gf">Без глютена</label>
        </div>
        <div className="form-check">
          <input type="checkbox" id="df" checked={data.dietaryTags?.includes("dairyFree")} onChange={() => toggleDietary("dairyFree")} />
          <label htmlFor="df">Без молока</label>
        </div>
        <div className="form-check">
          <input type="checkbox" id="halal" checked={data.dietaryTags?.includes("halal")} onChange={() => toggleDietary("halal")} />
          <label htmlFor="halal">Халяль</label>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Аллергии (добавьте и нажмите Enter)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAllergy(); } }}
              placeholder="орехи, рыба…"
            />
            <button className="btn sm" onClick={addAllergy}>Добавить</button>
          </div>
          {(data.allergies || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {(data.allergies || []).map((a: string, i: number) => (
                <span key={i} style={{ background: "var(--soft)", padding: "4px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer" }} onClick={() => removeAllergy(i)}>
                  {a} ✕
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Ручной ввод калорийности (необязательно)</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>
          Если вы знаете свою целевую калорийность, укажите её вручную. Это отменит автоматический расчёт.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label>Калории, ккал</label>
            <input type="number" min="0" value={data.customCalories || ""} onChange={(e) => update({ customCalories: e.target.value ? parseInt(e.target.value) : null })} placeholder="Авто" />
          </div>
          <div className="form-group">
            <label>Белки, г</label>
            <input type="number" min="0" value={data.customProtein || ""} onChange={(e) => update({ customProtein: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Авто" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Жиры, г</label>
            <input type="number" min="0" value={data.customFat || ""} onChange={(e) => update({ customFat: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Авто" />
          </div>
          <div className="form-group">
            <label>Углеводы, г</label>
            <input type="number" min="0" value={data.customCarbs || ""} onChange={(e) => update({ customCarbs: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Авто" />
          </div>
        </div>
      </div>

      {calc && calc.calories > 0 && (
        <div className="card" style={{ background: "linear-gradient(180deg, #fbfaf6 0%, var(--card) 60%)" }}>
          <h2>Результат расчёта</h2>
          <div className="metrics">
            <div className="metric big">
              <div className="label">Калории</div>
              <div className="value">{calc.calories.toLocaleString("ru-RU")} ккал</div>
            </div>
            <div className="metric"><div className="label">Белки</div><div className="value">{calc.macros.proteins} г</div></div>
            <div className="metric"><div className="label">Жиры</div><div className="value">{calc.macros.fats} г</div></div>
            <div className="metric"><div className="label">Углеводы</div><div className="value">{calc.macros.carbs} г</div></div>
          </div>
          {calc.warnings?.map((w: string, i: number) => (
            <div key={i} className="alert warning" style={{ marginTop: 12 }}>⚠️ {w}</div>
          ))}
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
            Источники: Mifflin-St Jeor (Am J Clin Nutr, 1990), USDA FoodData Central, CIQUAL/ANSES
          </p>
        </div>
      )}

      <button className="btn primary block lg" onClick={save} disabled={saving} style={{ marginTop: 20 }}>
        {saving ? "Сохранение…" : saved ? "✓ Сохранено" : "Сохранить анкету"}
      </button>
    </div>
  );
}
