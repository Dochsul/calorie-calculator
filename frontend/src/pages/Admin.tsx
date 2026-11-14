import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [tab, setTab] = useState<"stats" | "users" | "payments" | "plans">("stats");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, p, pl] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminPayments(),
        api.getAdminPlans(),
      ]);
      setStats(s);
      setUsers(u.users);
      setPayments(p);
      setPlans(pl);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async (code: string, priceCents: number) => {
    try {
      await api.updatePlan(code, { priceCents });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-screen">Загрузка админ-панели…</div>;

  return (
    <div>
      <h1 className="page-title">⚙️ Панель администратора</h1>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {([
          ["stats", "Статистика"], ["users", "Пользователи"],
          ["payments", "Платежи"], ["plans", "Тарифы"],
        ] as const).map(([k, label]) => (
          <button key={k} className={`btn sm ${tab === k ? "primary" : ""}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "stats" && stats && (
        <>
          <div className="admin-grid">
            <div className="admin-stat">
              <div className="label">Пользователей</div>
              <div className="value">{stats.totalUsers}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Активных подписок</div>
              <div className="value">{stats.activeSubs}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Выручка всего</div>
              <div className="value gold">{stats.totalRevenueEuros.toFixed(2)} €</div>
            </div>
            <div className="admin-stat">
              <div className="label">Выручка за месяц</div>
              <div className="value gold">{stats.monthRevenueEuros.toFixed(2)} €</div>
            </div>
            <div className="admin-stat">
              <div className="label">Отменено</div>
              <div className="value">{stats.canceledSubs}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Неуспешных платежей</div>
              <div className="value">{stats.failedPayments}</div>
            </div>
            <div className="admin-stat">
              <div className="label">Меню создано</div>
              <div className="value">{stats.totalMenus}</div>
            </div>
          </div>

          {stats.subsByPlan?.length > 0 && (
            <div className="card">
              <h2>Подписки по тарифам</h2>
              {stats.subsByPlan.map((s: any) => (
                <div key={s.planCode} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{s.planCode === "monthly" ? "Месячный" : s.planCode === "quarterly" ? "Квартальный" : "Годовой"}</span>
                  <b>{s._count} активных</b>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="admin-table">
            <thead>
              <tr><th>Email</th><th>Имя</th><th>Роль</th><th>Подписка</th><th>Регистрация</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.name || "—"}</td>
                  <td>{u.role === "admin" ? "Админ" : "Пользователь"}</td>
                  <td>{u.subscription?.status === "active" ? "✓ Активна" : "—"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payments" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="admin-table">
            <thead>
              <tr><th>Дата</th><th>Пользователь</th><th>Тариф</th><th>Сумма</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>Платежей пока нет</td></tr>
              ) : payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString("ru-RU")}</td>
                  <td>{p.user?.email}</td>
                  <td>{p.planCode}</td>
                  <td>{(p.amountCents / 100).toFixed(2)} €</td>
                  <td>{p.status === "succeeded" ? "✓ Оплачен" : p.status === "failed" ? "✕ Ошибка" : p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "plans" && (
        <div className="card">
          <h2>Управление тарифами</h2>
          {plans.map((p) => (
            <PlanEditor key={p.code} plan={p} onSave={updatePlan} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanEditor({ plan, onSave }: { plan: any; onSave: (code: string, priceCents: number) => void }) {
  const [price, setPrice] = useState((plan.priceCents / 100).toFixed(2));

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <b>{plan.name}</b>
        <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>
          {plan.durationDays} дней · {plan.stripePriceId ? "Stripe подключён" : "без Stripe"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ width: 80, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8 }}
        />
        <span>€</span>
        <button className="btn sm primary" onClick={() => onSave(plan.code, Math.round(parseFloat(price) * 100))}>
          Сохранить
        </button>
      </div>
    </div>
  );
}
