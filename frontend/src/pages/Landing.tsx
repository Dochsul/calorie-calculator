import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Landing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => {});
  }, []);

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="brand">
          <span className="mark">A</span>
          Aina <em>Évidence</em>
        </div>
        <h1>Умный конструктор питания на научной основе</h1>
        <p>Персональное меню с точным расчётом КБЖУ из проверенных пищевых баз данных. 
           Составляйте рацион из того, что есть дома, и достигайте своих целей.</p>
        <div className="cta-group">
          {user ? (
            <Link to="/dashboard" className="btn primary lg">Перейти в кабинет</Link>
          ) : (
            <>
              <Link to="/register" className="btn primary lg">Начать бесплатно</Link>
              <Link to="/login" className="btn lg" style={{ background: "rgba(255,255,255,.1)", color: "white", borderColor: "rgba(255,255,255,.3)" }}>Войти</Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section">
        <h2>Как это работает</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="icon">📋</div>
            <h3>Анкета питания</h3>
            <p>Укажите цель, возраст, рост, вес, активность, аллергии и предпочтения. 
               Расчёт по формуле Миффлина-Сан Жеора.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🧊</div>
            <h3>Умный холодильник</h3>
            <p>Добавьте продукты, которые есть дома. Приложение предложит рецепты 
               из имеющихся ингредиентов и покажет недостающее.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🍽️</div>
            <h3>Меню на завтра</h3>
            <p>Получите персональное меню с точным расчётом калорий и БЖУ. 
               Заменяйте блюда, меняйте порции, планируйте на неделю.</p>
          </div>
          <div className="feature-card">
            <div className="icon">📊</div>
            <h3>Научный расчёт КБЖУ</h3>
            <p>Данные из баз USDA FoodData Central и CIQUAL/ANSES. 
               Не приблизительные оценки, а программный расчёт.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🛒</div>
            <h3>Список покупок</h3>
            <p>Автоматически составленный список покупок на основе вашего меню. 
               Группировка по категориям продуктов.</p>
          </div>
          <div className="feature-card">
            <div className="icon">👨‍👩‍👧</div>
            <h3>Семейный режим</h3>
            <p>Составляйте меню для всей семьи. Одно общее блюдо — разные порции 
               с учётом возраста и потребностей.</p>
          </div>
        </div>
      </section>

      {plans.length > 0 && (
        <section className="landing-section">
          <h2>Тарифы</h2>
          <div className="pricing-grid">
            {plans.map((p) => (
              <div key={p.code} className={`pricing-card ${p.code === "quarterly" ? "popular" : ""}`}>
                {p.code === "quarterly" && <span className="badge">Выгодно</span>}
                <h3>{p.name}</h3>
                <div className="price">{(p.priceCents / 100).toFixed(2)} €</div>
                <div className="per">
                  {p.interval === "month" ? "в месяц" : p.interval === "quarter" ? "за 3 месяца" : "за 12 месяцев"}
                </div>
                <ul>
                  <li>Персональное меню</li>
                  <li>Расчёт КБЖУ</li>
                  <li>Замена блюд</li>
                  <li>Семейный режим</li>
                  <li>История меню</li>
                </ul>
                <Link to="/register" className="btn primary block">Выбрать</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="landing-section">
        <div className="alert warning">
          ⚠️ Приложение предназначено для информационного планирования питания и не заменяет 
          диагностику, лечение или персональную медицинскую консультацию.
        </div>
      </section>

      <footer className="landing-footer">
        AINA Evidence · Умный конструктор питания · Источники данных: USDA FoodData Central, CIQUAL/ANSES
      </footer>
    </div>
  );
}
