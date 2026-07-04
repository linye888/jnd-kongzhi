import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatRate } from "../lib/api";

interface DomainRow {
  id: number;
  hostname: string;
  customerId: number;
  productId: number;
  landingPageId: number;
  status: string;
  customerName: string;
  productName: string;
  landingPageName: string;
  sslStatus: string;
  cfCustomHostnameId: string | null;
  cnameTarget: string;
  todayStats: { pageViews: number; uniqueVisitors: number; botPageViews: number; downloadCount: number; uniqueDownloaders: number; conversionRate: number };
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setError("");
    setMessage("");
    try {
      const row = await api<DomainRow & { cfWarning?: string | null }>("/api/admin/domains", {
        method: "POST",
        body: JSON.stringify({
          hostname: form.hostname,
          customerId: Number(form.customerId),
          productId: Number(form.productId),
          landingPageId: Number(form.landingPageId),
        }),
      });
      setForm({ hostname: "", customerId: "", productId: "", landingPageId: "" });
      if (row.cfWarning) {
        setMessage(`域名 ${row.hostname} 已添加。${row.cfWarning}`);
      } else if (!row.cfCustomHostnameId) {
        setMessage(`域名 ${row.hostname} 已添加，但 Cloudflare SSL 未自动创建`);
      } else {
        setMessage(`域名 ${row.hostname} 已添加，SSL 状态：${row.sslStatus}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    }
  }

  async function importCsv() {
    setError("");
    setMessage("");
    try {
      const lines = csv.trim().split("\n").filter(Boolean);
      const parsed = lines.map((line) => {
        const [hostname, customerId, productId, landingPageId] = line.split(",").map((v) => v.trim());
        return { hostname, customerId: Number(customerId), productId: Number(productId), landingPageId: Number(landingPageId) };
      });
      const result = await api<{ success: number; failed: Array<{ row: number; hostname: string; error: string }>; warnings?: Array<{ hostname: string; message: string }> }>(
        "/api/admin/domains/import",
        { method: "POST", body: JSON.stringify({ rows: parsed }) },
      );
      setCsv("");
      const warnCount = result.warnings?.length ?? 0;
      setMessage(`导入完成：成功 ${result.success} 条${result.failed.length ? `，失败 ${result.failed.length} 条` : ""}${warnCount ? `，SSL 警告 ${warnCount} 条` : ""}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    }
  }

  async function updateDomain(id: number, patch: { landingPageId?: number; status?: string }) {
    setError("");
    await api(`/api/admin/domains/${id}`, { method: "PUT", body: JSON.stringify(patch) });
    setMessage("域名已更新");
    await load();
  }

  async function refreshSsl(id: number) {
    setError("");
    try {
      const row = await api<DomainRow>(`/api/admin/domains/${id}/refresh-ssl`, { method: "POST" });
      setMessage(`${row.hostname} SSL 状态：${row.sslStatus}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刷新失败");
    }
  }

  async function deleteDomain(id: number, hostname: string) {
    if (!confirm(`确定删除域名 ${hostname}？`)) return;
    setError("");
    await api(`/api/admin/domains/${id}`, { method: "DELETE" });
    setMessage(`已删除 ${hostname}`);
    await load();
  }

  return (
    <div>
      <h1>域名管理</h1>
      {message ? <div className="notice" style={{ marginBottom: 12 }}>{message}</div> : null}
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

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
              <th>状态</th>
              <th>SSL</th>
              <th>CNAME</th>
              <th>今日 PV</th>
              <th>今日 UV</th>
              <th>疑似机器人</th>
              <th>今日下载</th>
              <th>转化率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link className="link" to={`/domains/${row.id}`}>{row.hostname}</Link></td>
                <td>{row.customerName} / {row.productName}</td>
                <td>
                  <select
                    value={row.landingPageId}
                    onChange={(e) => updateDomain(row.id, { landingPageId: Number(e.target.value) })}
                  >
                    {landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.name}</option>)}
                  </select>
                </td>
                <td>
                  <select
                    value={row.status}
                    onChange={(e) => updateDomain(row.id, { status: e.target.value })}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </td>
                <td><span className={`badge ${row.sslStatus}`}>{row.sslStatus}</span></td>
                <td><code>{row.cnameTarget}</code></td>
                <td>{row.todayStats.pageViews}</td>
                <td>{row.todayStats.uniqueVisitors}</td>
                <td>{row.todayStats.botPageViews ?? 0}</td>
                <td>{row.todayStats.downloadCount}</td>
                <td>{formatRate(row.todayStats.conversionRate)}</td>
                <td className="actions">
                  <Link className="btn btn-secondary" to={`/domains/${row.id}`}>详情</Link>
                  <button
                    className="btn btn-secondary"
                    disabled={!row.cfCustomHostnameId}
                    title={row.cfCustomHostnameId ? "刷新 SSL 状态" : "未创建 Custom Hostname"}
                    onClick={() => refreshSsl(row.id)}
                  >
                    刷新 SSL
                  </button>
                  <button className="btn btn-secondary" onClick={() => deleteDomain(row.id, row.hostname)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
