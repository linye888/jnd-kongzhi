import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Product { id: number; customerId: number; name: string }
interface Customer { id: number; name: string }

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");

  async function load() {
    const [products, customerRows] = await Promise.all([
      api<Product[]>("/api/admin/products"),
      api<Customer[]>("/api/admin/customers"),
    ]);
    setRows(products);
    setCustomers(customerRows);
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/products", { method: "POST", body: JSON.stringify({ customerId: Number(customerId), name }) });
    setCustomerId("");
    setName("");
    await load();
  }

  return (
    <div>
      <h1>产品管理</h1>
      <div className="panel" style={{ marginBottom: 16 }}>
        <form className="form-grid" onSubmit={createProduct}>
          <label>客户<select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required><option value="">选择客户</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>产品名称<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <button className="btn btn-primary">添加产品</button>
        </form>
      </div>
      <div className="panel">
        <table className="table">
          <thead><tr><th>ID</th><th>客户 ID</th><th>产品名称</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.customerId}</td><td>{row.name}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
