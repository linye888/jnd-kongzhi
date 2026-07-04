import { useEffect, useState } from "react";
import { api, formatRate } from "../lib/api";

interface DomainRow {
  id: number;
  hostname: string;
  customerName: string;
  productName: string;
  landingPageName: string;
  sslStatus: string;
  cnameTarget: string;
  todayStats: { pageViews: number; uniqueVisitors: number; downloadCount: number; uniqueDownloaders: number; conversionRate: number };
}

interface Customer { id: number; name: string }
interface Product { id: number; name: string; customerId: number }
interface LandingPage { id: number; name: string }

export default function DomainsPage() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [form, setForm] = useState({ hostname: "", customerId: "", productId: "", landingPageId: "" });
  const [csv, setCsv] = useState("");

  async function load() {
    const [domains, customerRows, productRows, lpRows] = await Promise.all([
      api<DomainRow[]>("/api/admin/domains"),
      api<Customer[]>("/api/admin/customers"),
      api<Product[]>("/api/admin/products"),
      api<LandingPage[]>("/api/admin/landing-pages"),
    ]);
    setRows(domains);
    setCustomers(customerRows);
    setProducts(productRows);
    setLandingPages(lpRows);
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function createDomain(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/domains", {
      method: "POST",
      body: JSON.stringify({
        hostname: form.hostname,
        customerId: Number(form.customerId),
        productId: Number(form.productId),
        landingPageId: Number(form.landingPageId),
      }),
    });
    setForm({ hostname: "", customerId: "", productId: "", landingPageId: "" });
    await load();
  }

  async function importCsv() {
    const lines = csv.trim().split("\n").filter(Boolean);
    const parsed = lines.map((line) => {
      const [hostname, customerId, productId, landingPageId] = line.split(",").map((v) => v.trim());
      return { hostname, customerId: Number(customerId), productId: Number(productId), landingPageId: Number(landingPageId) };
    });
    await api("/api/admin/domains/import", { method: "POST", body: JSON.stringify({ rows: parsed }) });
    setCsv("");
    await load();
  }

  return (
    <div>
      <h1>域名管理</h1>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>添加域名</h2>
        <form className="form-grid" onSubmit={createDomain}>
          <label>域名<input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="landing.example.com" required /></label>
          <label>客户<select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required><option value="">选择客户</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>产品<select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required><option value="">选择产品</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>落地页<select value={form.landingPageId} onChange={(e) => setForm({ ...form, landingPageId: e.target.value })} required><option value="">选择落地页</option>{landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.name}</option>)}</select></label>
          <button className="btn btn-primary">添加域名</button>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>批量导入 CSV</h2>
        <p className="muted">格式：hostname,customerId,productId,landingPageId</p>
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="landing-a.com,1,1,1" />
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={importCsv}>导入</button>
        </div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>域名</th>
              <th>客户/产品</th>
              <th>落地页</th>
              <th>SSL</th>
              <th>CNAME</th>
              <th>今日 PV</th>
              <th>今日 UV</th>
              <th>今日下载</th>
              <th>独立下载</th>
              <th>转化率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.hostname}</td>
                <td>{row.customerName} / {row.productName}</td>
                <td>{row.landingPageName}</td>
                <td><span className={`badge ${row.sslStatus}`}>{row.sslStatus}</span></td>
                <td>{row.cnameTarget}</td>
                <td>{row.todayStats.pageViews}</td>
                <td>{row.todayStats.uniqueVisitors}</td>
                <td>{row.todayStats.downloadCount}</td>
                <td>{row.todayStats.uniqueDownloaders}</td>
                <td>{formatRate(row.todayStats.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
