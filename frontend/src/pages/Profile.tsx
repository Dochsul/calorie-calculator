import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMe({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadData = async () => {
    try {
      const [q, fridge, menus, payments] = await Promise.all([
        api.getQuestionnaire().catch(() => ({})),
        api.getFridge().catch(() => []),
        api.getMenus().catch(() => []),
        api.getPayments().catch(() => []),
      ]);
      const data = { profile: user, questionnaire: q, fridge, menus, payments, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aina-evidence-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Ошибка экспорта данных");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Вы уверены? Все ваши данные будут удалены безвозвратно.")) return;
    if (!confirm("Это действие необратимо. Подтвердите удаление аккаунта.")) return;
    try {
      await api.deleteMe();
      logout();
      navigate("/");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">👤 Профиль и настройки</h1>

      <div className="card">
        <h2>Личные данные</h2>
        <div className="form-group">
          <label>Имя</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={user?.email || ""} disabled style={{ opacity: 0.6 }} />
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? "Сохранение…" : saved ? "✓ Сохранено" : "Сохранить"}
        </button>
      </div>

      <div className="card">
        <h2>Конфиденциальность (GDPR)</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
          В соответствии с GDPR вы имеете право на доступ к своим данным, их экспорт и удаление.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={downloadData}>📥 Скачать мои данные</button>
        </div>
      </div>

      <div className="card">
        <h2>Удаление аккаунта</h2>
        <p style={{ color: "var(--danger)", fontSize: 14, marginBottom: 14 }}>
          Удаление аккаунта приведёт к безвозвратному удалению всех ваших данных: анкеты, холодильника, 
          меню и истории платежей. Это действие нельзя отменить.
        </p>
        <button className="btn danger" onClick={deleteAccount}>Удалить аккаунт</button>
      </div>

      <div className="alert info">
        📋 AINA Evidence обрабатывает персональные данные питания и здоровья на законном основании 
        (ст. 6 GDPR) и с необходимыми мерами безопасности. Данные банковских карт не хранятся — 
        обработка платежей осуществляется Stripe.
      </div>
    </div>
  );
}
