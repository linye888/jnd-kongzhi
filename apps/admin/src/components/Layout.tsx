import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import SetupBanner from "./SetupBanner";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/stats", label: "数据统计" },
  { to: "/domains", label: "域名管理" },
  { to: "/landing-pages", label: "落地页管理" },
  { to: "/customers", label: "客户管理" },
  { to: "/products", label: "产品管理" },
  { to: "/users", label: "用户管理" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">LP Admin</div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>落地页管理平台</div>
            <strong>{user?.name}</strong>
          </div>
          <button className="btn btn-secondary" onClick={logout}>退出登录</button>
        </div>
        <SetupBanner />
        <Outlet />
      </main>
    </div>
  );
}
