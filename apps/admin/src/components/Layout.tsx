import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/domains/guide", label: "添加域名" },
  { to: "/domains", label: "域名管理" },
  { to: "/stats", label: "数据统计" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">LP Admin</div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/" || link.to === "/domains"}>
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
        <Outlet />
      </main>
    </div>
  );
}
