import { useState, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", icon: "🏠", label: "Главная" },
  { to: "/questionnaire", icon: "📋", label: "Моя анкета" },
  { to: "/fridge", icon: "🧊", label: "Холодильник" },
  { to: "/menu", icon: "🍽️", label: "Моё меню" },
  { to: "/shopping", icon: "🛒", label: "Список покупок" },
  { to: "/subscription", icon: "💳", label: "Подписка" },
  { to: "/profile", icon: "👤", label: "Профиль" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-layout">
      <div className="mobile-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <span className="brand">Aina <em>Évidence</em></span>
      </div>
      <div className={`backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="logo">
          <div className="brand">
            <span className="mark">A</span>
            Aina <em>Évidence</em>
          </div>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="nav-section">Администратор</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="icon">⚙️</span>
              Панель админа
            </NavLink>
          </>
        )}
        <div className="bottom">
          <div className="user-info">
            <b>{user?.name || user?.email}</b><br />
            {user?.email}
          </div>
          <button className="btn sm block" onClick={handleLogout}>Выйти</button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
