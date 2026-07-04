import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Customer { id: number; name: string; notes: string | null }

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setRows(await api<Customer[]>("/api/admin/customers"));
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/customers", { method: "POST", body: JSON.stringify({ name, notes }) });
    setName("");
    setNotes("");
    await load();
  }

  return (
    <div>
      <h1>客户管理</h1>
      <div className="panel" style={{ marginBottom: 16 }}>
        <form className="form-grid" onSubmit={createCustomer}>
          <label>客户名称<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>备注<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <button className="btn btn-primary">添加客户</button>
        </form>
      </div>
      <div className="panel">
        <table className="table">
          <thead><tr><th>ID</th><th>名称</th><th>备注</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.name}</td><td>{row.notes ?? "-"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
