import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Subscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => {});
    api.getSubStatus().then(setSub).catch(() => {});
    api.getPayments().then(setPayments).catch(() => {});
  }, []);

  const checkout = async (planCode: string) => {
    setLoading(planCode);
    try {
      const { url } = await api.checkout(planCode);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(null);
    }
  };

  const cancel = async () => {
    if (!confirm("Отменить автопродление? Доступ сохранится до конца оплаченного периода.")) return;
    setLoading("cancel");
    try {
      await api.cancelSub();
      const updated = await api.getSubStatus();
      setSub(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(null);
    }
  };

  const isActive = sub?.isActive;
  const planLabel = (code: string) => code === "monthly" ? "месячный" : code === "quarterly" ? "квартальный" : "годовой";

  return (
    <div>
      <h1 className="page-title">💳 Подписка</h1>

      {isActive ? (
        <div className="sub-status active">
          <span className="dot" />
          Подписка активна{sub?.planCode ? ` — ${planLabel(sub.planCode)} тариф` : ""}
          {sub?.currentPeriodEnd && (
            <span style={{ fontWeight: 400, fontSize: 13 }}>
              до {new Date(sub.currentPeriodEnd).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
      ) : (
        <div className="sub-status none">
          <span className="dot" />
          Подписка не активна
        </div>
      )}

      {sub?.cancelAtPeriodEnd && (
        <div className="alert info">
          Автопродление отменено. Доступ сохранён до {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("ru-RU") : "конца периода"}.
        </div>
      )}

      <h2 style={{ font: "600 20px var(--serif)", margin: "20px 0 16px" }}>Тарифные планы</h2>
      <div className="pricing-grid" style={{ maxWidth: "none" }}>
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
              <li>План на 7 дней</li>
              <li>Семейный режим</li>
              <li>История меню</li>
            </ul>
            {isActive && !sub?.cancelAtPeriodEnd ? (
              <button className="btn block" disabled>Активен</button>
            ) : (
              <button
                className="btn primary block"
                onClick={() => checkout(p.code)}
                disabled={loading === p.code}
              >
                {loading === p.code ? "Перенаправление…" : "Оплатить"}
              </button>
            )}
          </div>
        ))}
      </div>

      {isActive && !sub?.cancelAtPeriodEnd && (
        <button className="btn danger" onClick={cancel} disabled={loading === "cancel"} style={{ marginTop: 16 }}>
          {loading === "cancel" ? "Отмена…" : "Отменить автопродление"}
        </button>
      )}

      {payments.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>История платежей</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Дата</th><th>Тариф</th><th>Сумма</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString("ru-RU")}</td>
                  <td>{planLabel(p.planCode)}</td>
                  <td>{(p.amountCents / 100).toFixed(2)} €</td>
                  <td>{p.status === "succeeded" ? "✓ Оплачен" : p.status === "failed" ? "✕ Ошибка" : p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="alert info" style={{ marginTop: 20 }}>
        🔒 Оплата обрабатывается через Stripe. Мы не храним данные вашей банковской карты.
        Цены включают применимые налоги.
      </div>

      <div className="alert warning">
        ⚠️ Приложение предназначено для информационного планирования питания и не заменяет медицинскую консультацию.
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
        Условия отмены: вы можете отменить автопродление в любой момент. Доступ сохраняется до конца оплаченного периода.
        Возврат средств осуществляется в соответствии с применимым законодательством.
      </p>
    </div>
  );
}
