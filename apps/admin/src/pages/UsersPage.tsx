import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface UserRow { id: number; email: string; name: string; role: string; status: string }

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "operator" });

  async function load() {
    setRows(await api<UserRow[]>("/api/admin/users"));
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
    setForm({ email: "", name: "", password: "", role: "operator" });
    await load();
  }

  return (
    <div>
      <h1>用户管理</h1>
      <p className="muted">支持多角色，但当前所有用户拥有全部权限。</p>
      <div className="panel" style={{ marginBottom: 16 }}>
        <form className="form-grid" onSubmit={createUser}>
          <label>邮箱<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>姓名<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>密码<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
          <label>角色<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">admin</option><option value="operator">operator</option></select></label>
          <button className="btn btn-primary">添加用户</button>
        </form>
      </div>
      <div className="panel">
        <table className="table">
          <thead><tr><th>ID</th><th>邮箱</th><th>姓名</th><th>角色</th><th>状态</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.email}</td><td>{row.name}</td><td>{row.role}</td><td>{row.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
