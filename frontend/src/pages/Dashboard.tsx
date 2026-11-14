import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [calc, setCalc] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [hasQuestionnaire, setHasQuestionnaire] = useState(false);

  useEffect(() => {
    api.getCalc().then((c) => {
      setCalc(c);
      if (c.calories > 0) setHasQuestionnaire(true);
    }).catch(() => {});
    api.getSubStatus().then(setSub).catch(() => {});
  }, []);

  const isActive = sub?.isActive;

  return (
    <div>
      <h1 className="page-title">Добро пожаловать{user?.name ? `, ${user.name}` : ""}!</h1>

      {!hasQuestionnaire && (
        <div className="alert info">
          📋 Заполните анкету питания, чтобы получить персональный расчёт калорий и БЖУ.
          <Link to="/questionnaire" style={{ marginLeft: 8, fontWeight: 600 }}>Заполнить →</Link>
        </div>
      )}

      {calc?.warnings?.map((w: string, i: number) => (
        <div key={i} className="alert warning">⚠️ {w}</div>
      ))}

      {calc && calc.calories > 0 && (
        <div className="card">
          <h2>Ваш расчёт</h2>
          <div className="metrics">
            <div className="metric big">
              <div className="label">Калории</div>
              <div className="value">{calc.calories.toLocaleString("ru-RU")} ккал</div>
            </div>
            <div className="metric">
              <div className="label">Белки</div>
              <div className="value">{calc.macros.proteins} г</div>
            </div>
            <div className="metric">
              <div className="label">Жиры</div>
              <div className="value">{calc.macros.fats} г</div>
            </div>
            <div className="metric">
              <div className="label">Углеводы</div>
              <div className="value">{calc.macros.carbs} г</div>
            </div>
          </div>
          {calc.mealPlan && (
            <div style={{ marginTop: 16 }}>
              <h3>Распределение по приёмам пищи</h3>
              {calc.mealPlan.map((m: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{m.name}</span>
                  <b style={{ color: "var(--accent)" }}>{m.kcal} ккал</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>Быстрые действия</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Link to="/menu" className="btn primary" style={{ justifyContent: "flex-start" }}>🍽️ Составить меню на завтра</Link>
          <Link to="/fridge" className="btn" style={{ justifyContent: "flex-start" }}>🧊 Мой холодильник</Link>
          <Link to="/questionnaire" className="btn" style={{ justifyContent: "flex-start" }}>📋 Моя анкета</Link>
          <Link to="/shopping" className="btn" style={{ justifyContent: "flex-start" }}>🛒 Список покупок</Link>
        </div>
      </div>

      <div className="card">
        <h2>Подписка</h2>
        {isActive ? (
          <div className="sub-status active">
            <span className="dot" />
            Подписка активна{sub?.planCode ? ` — ${sub.planCode === "monthly" ? "месячный" : sub.planCode === "quarterly" ? "квартальный" : "годовой"} тариф` : ""}
          </div>
        ) : (
          <>
            <div className="sub-status none">
              <span className="dot" />
              Подписка не активна
            </div>
            <p style={{ color: "var(--muted)", marginBottom: 14, fontSize: 14 }}>
              Активируйте подписку для доступа ко всем функциям: генерация меню, замены блюд, 
              семейный режим, история меню и список покупок.
            </p>
            <Link to="/subscription" className="btn primary">Выбрать тариф</Link>
          </>
        )}
      </div>

      <div className="alert warning" style={{ marginTop: 20 }}>
        ⚠️ AINA Evidence предназначен для информационного планирования питания и не заменяет 
        медицинскую консультацию. При беременности, лактации, возрасте до 18 лет или заболеваниях 
        проконсультируйтесь со специалистом.
      </div>
    </div>
  );
}
