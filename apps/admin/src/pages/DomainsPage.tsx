import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DomainSetupGuide } from "@lp-admin/shared";
import DomainSetupGuidePanel from "../components/DomainSetupGuide";
import { api, formatRate } from "../lib/api";

interface DomainRow {
  id: number;
  hostname: string;
  downloadUrl: string;
  pixelId: string;
  status: string;
  sslStatus: string;
  todayStats: {
    pageViews: number;
    uniqueVisitors: number;
    botPageViews: number;
    downloadCount: number;
    conversionRate: number;
  };
}

interface DomainDraft {
  downloadUrl: string;
  pixelId: string;
}

export default function DomainsPage() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DomainDraft>>({});
  const [form, setForm] = useState({ hostname: "", downloadUrl: "", pixelId: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSetup, setLastSetup] = useState<DomainSetupGuide | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load() {
    const domains = await api<DomainRow[]>("/api/admin/domains");
    setRows(domains);
    setDrafts(
      Object.fromEntries(domains.map((d) => [d.id, { downloadUrl: d.downloadUrl, pixelId: d.pixelId }])),
    );
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createDomain(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const row = await api<DomainRow & { setup?: DomainSetupGuide; warnings?: string[] }>("/api/admin/domains", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ hostname: "", downloadUrl: "", pixelId: "" });
      if (row.setup) setLastSetup(row.setup);
      const warnText = row.warnings?.length ? ` ${row.warnings.join(" ")}` : "";
      setMessage(`已添加 ${row.hostname}${warnText}`.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    }
  }

  async function saveRow(id: number) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setError("");
    try {
      await api(`/api/admin/domains/${id}`, {
        method: "PUT",
        body: JSON.stringify({ downloadUrl: draft.downloadUrl, pixelId: draft.pixelId }),
      });
      setMessage("已保存");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleStatus(id: number, status: string) {
    setError("");
    await api(`/api/admin/domains/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    await load();
  }

  async function deleteDomain(id: number, hostname: string) {
    if (!confirm(`确定删除域名 ${hostname}？`)) return;
    setError("");
    await api(`/api/admin/domains/${id}`, { method: "DELETE" });
    setMessage(`已删除 ${hostname}`);
    await load();
  }

  function setDraft(id: number, patch: Partial<DomainDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  return (
    <div>
      <h1>域名管理</h1>
      <p className="muted">添加域名，填写下载链接和 Pixel ID 即可投放</p>

      {message ? <div className="notice" style={{ marginBottom: 12 }}>{message}</div> : null}
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      {lastSetup ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>DNS 配置指引</h2>
          <DomainSetupGuidePanel guide={lastSetup} />
        </div>
      ) : null}

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>添加域名</h2>
        <form className="form-grid" onSubmit={createDomain}>
          <label>
            域名
            <input
              value={form.hostname}
              onChange={(e) => setForm({ ...form, hostname: e.target.value })}
              placeholder="india.minishort.sbs"
              required
            />
          </label>
          <label>
            下载链接
            <input
              value={form.downloadUrl}
              onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
              placeholder="https://..."
              required
            />
          </label>
          <label>
            Pixel ID
            <input
              value={form.pixelId}
              onChange={(e) => setForm({ ...form, pixelId: e.target.value })}
              placeholder="4377607675843081"
              required
            />
          </label>
          <button className="btn btn-primary">添加</button>
        </form>
      </div>

      <div className="panel">
        <table className="table table-domains">
          <thead>
            <tr>
              <th>域名</th>
              <th>下载链接</th>
              <th>Pixel ID</th>
              <th>状态</th>
              <th>今日 PV</th>
              <th>今日 UV</th>
              <th>今日下载</th>
              <th>转化率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.id] ?? { downloadUrl: row.downloadUrl, pixelId: row.pixelId };
              const dirty =
                draft.downloadUrl !== row.downloadUrl || draft.pixelId !== row.pixelId;
              return (
                <tr key={row.id}>
                  <td>
                    <Link className="link" to={`/domains/${row.id}`}>{row.hostname}</Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      SSL: <span className={`badge ${row.sslStatus}`}>{row.sslStatus}</span>
                    </div>
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={draft.downloadUrl}
                      onChange={(e) => setDraft(row.id, { downloadUrl: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input table-input-short"
                      value={draft.pixelId}
                      onChange={(e) => setDraft(row.id, { pixelId: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={row.status}
                      onChange={(e) => toggleStatus(row.id, e.target.value)}
                    >
                      <option value="active">启用</option>
                      <option value="inactive">停用</option>
                    </select>
                  </td>
                  <td>{row.todayStats.pageViews}</td>
                  <td>{row.todayStats.uniqueVisitors}</td>
                  <td>{row.todayStats.downloadCount}</td>
                  <td>{formatRate(row.todayStats.conversionRate)}</td>
                  <td className="actions">
                    <button
                      className="btn btn-secondary"
                      disabled={!dirty || savingId === row.id}
                      onClick={() => saveRow(row.id)}
                    >
                      {savingId === row.id ? "保存中…" : "保存"}
                    </button>
                    <a
                      className="btn btn-secondary"
                      href={`https://${row.hostname}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      访问
                    </a>
                    <button className="btn btn-secondary" onClick={() => deleteDomain(row.id, row.hostname)}>
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="muted" style={{ marginTop: 12 }}>暂无域名，请在上方添加</p> : null}
      </div>
    </div>
  );
}
