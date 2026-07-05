import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DomainSetupGuide, LandingTemplateOption } from "@lp-admin/shared";
import DomainSetupGuidePanel from "../components/DomainSetupGuide";
import { api, formatRate } from "../lib/api";

interface DomainRow {
  id: number;
  hostname: string;
  downloadUrl: string;
  pixelId: string;
  templateKey: string;
  templateName: string;
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
  templateKey: string;
}

interface DomainHealth {
  ok: boolean;
  status: "healthy" | "unhealthy" | "inactive";
  statusCode?: number;
  message: string;
  checkedAt: string;
}

interface DomainForm {
  hostname: string;
  templateId: string;
  downloadUrl: string;
  pixelId: string;
}

function HealthBadge({ health, checking }: { health?: DomainHealth; checking?: boolean }) {
  if (checking || !health) {
    return (
      <span className="health-label" title="检测中…">
        <span className="health-dot checking" />
        检测中
      </span>
    );
  }
  const label = health.status === "healthy" ? "正常" : health.status === "inactive" ? "已停用" : "异常";
  return (
    <span className="health-label" title={health.message}>
      <span className={`health-dot ${health.status}`} />
      {label}
    </span>
  );
}

function buildFormFromTemplate(templates: LandingTemplateOption[], templateId: string, prev?: Partial<DomainForm>): DomainForm {
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  if (!template) {
    return { hostname: prev?.hostname ?? "", templateId: templateId || "india-en", downloadUrl: "", pixelId: "" };
  }
  return {
    hostname: prev?.hostname ?? "",
    templateId: template.id,
    downloadUrl: template.defaultDownloadUrl,
    pixelId: template.defaultPixelId,
  };
}

export default function DomainsPage() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [templates, setTemplates] = useState<LandingTemplateOption[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DomainDraft>>({});
  const [healthMap, setHealthMap] = useState<Record<number, DomainHealth>>({});
  const [healthChecking, setHealthChecking] = useState(false);
  const [form, setForm] = useState<DomainForm>({ hostname: "", templateId: "india-en", downloadUrl: "", pixelId: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSetup, setLastSetup] = useState<DomainSetupGuide | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load() {
    const domains = await api<DomainRow[]>("/api/admin/domains");
    setRows(domains);
    setDrafts(
      Object.fromEntries(
        domains.map((d) => [d.id, { downloadUrl: d.downloadUrl, pixelId: d.pixelId, templateKey: d.templateKey }]),
      ),
    );
    return domains;
  }

  async function runHealthCheck(ids?: number[]) {
    setHealthChecking(true);
    setError("");
    setHealthMap((prev) => {
      if (!ids?.length) return {};
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    try {
      const payload = ids?.length ? { ids } : {};
      const data = await api<{ results: Array<{ id: number; health: DomainHealth }> }>(
        "/api/admin/domains/health-check",
        { method: "POST", body: JSON.stringify(payload) },
      );
      setHealthMap((prev) => {
        const next = { ...prev };
        for (const item of data.results) {
          next[item.id] = item.health;
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "健康检查失败");
    } finally {
      setHealthChecking(false);
    }
  }

  useEffect(() => {
    api<LandingTemplateOption[]>("/api/admin/templates")
      .then((items) => {
        setTemplates(items);
        if (items.length > 0) {
          setForm((prev) => buildFormFromTemplate(items, prev.templateId || items[0].id, prev));
        }
      })
      .catch(console.error);

    load()
      .then((domains) => {
        if (domains.length > 0) runHealthCheck(domains.map((d) => d.id));
      })
      .catch(console.error);
  }, []);

  function onTemplateChange(templateId: string) {
    setForm((prev) => buildFormFromTemplate(templates, templateId, { hostname: prev.hostname }));
  }

  async function createDomain(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const row = await api<DomainRow & { setup?: DomainSetupGuide; warnings?: string[] }>("/api/admin/domains", {
        method: "POST",
        body: JSON.stringify({
          hostname: form.hostname,
          templateId: form.templateId,
          downloadUrl: form.downloadUrl,
          pixelId: form.pixelId,
        }),
      });
      setForm(buildFormFromTemplate(templates, form.templateId));
      if (row.setup) setLastSetup(row.setup);
      const warnText = row.warnings?.length ? ` ${row.warnings.join(" ")}` : "";
      setMessage(`已添加 ${row.hostname}${warnText}`.trim());
      const domains = await load();
      if (domains.length > 0) await runHealthCheck([row.id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    }
  }

  async function saveRow(id: number) {
    const draft = drafts[id];
    const row = rows.find((item) => item.id === id);
    if (!draft || !row) return;
    setSavingId(id);
    setError("");
    try {
      const payload: Record<string, string | boolean> = {
        downloadUrl: draft.downloadUrl,
        pixelId: draft.pixelId,
      };
      if (draft.templateKey !== row.templateKey) {
        payload.templateId = draft.templateKey;
      }
      await api(`/api/admin/domains/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage(draft.templateKey !== row.templateKey ? "模板与链接已保存" : "已保存");
      const domains = await load();
      await runHealthCheck([id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingId(null);
    }
  }

  function onRowTemplateChange(id: number, templateId: string, row: DomainRow) {
    const template = templates.find((item) => item.id === templateId);
    const current = drafts[id] ?? { downloadUrl: row.downloadUrl, pixelId: row.pixelId, templateKey: row.templateKey };
    if (templateId === row.templateKey) {
      setDraft(id, { ...current, templateKey: templateId });
      return;
    }
    const useDefaults = template
      ? confirm(
          `更换为「${template.name}」\n\n确定 = 同时使用该模板的默认下载链接和 Pixel\n取消 = 仅更换页面文案，保留当前链接和 Pixel`,
        )
      : false;
    if (useDefaults && template) {
      setDraft(id, {
        templateKey: templateId,
        downloadUrl: template.defaultDownloadUrl,
        pixelId: template.defaultPixelId,
      });
    } else {
      setDraft(id, { ...current, templateKey: templateId });
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

  const selectedTemplate = templates.find((item) => item.id === form.templateId);

  return (
    <div>
      <div className="topbar" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>域名管理</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            选择落地页模板，添加域名后修改下载链接和 Pixel ID 即可投放 ·{" "}
            <Link className="link" to="/domains/guide">查看添加引导</Link>
          </p>
        </div>
      </div>

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
            落地页模板
            <select value={form.templateId} onChange={(e) => onTemplateChange(e.target.value)} required>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          {selectedTemplate ? (
            <p className="muted" style={{ margin: 0, gridColumn: "1 / -1" }}>
              {selectedTemplate.description} · 默认奖励：{selectedTemplate.rewardText}
            </p>
          ) : null}
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
        <div className="topbar" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>域名列表</h2>
          <button
            className="btn btn-secondary"
            disabled={healthChecking || rows.length === 0}
            onClick={() => runHealthCheck()}
          >
            {healthChecking ? "检测中…" : "重新检测"}
          </button>
        </div>
        <table className="table table-domains">
          <thead>
            <tr>
              <th>健康</th>
              <th>域名</th>
              <th>模板</th>
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
              const draft = drafts[row.id] ?? {
                downloadUrl: row.downloadUrl,
                pixelId: row.pixelId,
                templateKey: row.templateKey,
              };
              const dirty =
                draft.downloadUrl !== row.downloadUrl
                || draft.pixelId !== row.pixelId
                || draft.templateKey !== row.templateKey;
              return (
                <tr key={row.id}>
                  <td>
                    <HealthBadge health={healthMap[row.id]} checking={healthChecking && !(row.id in healthMap)} />
                  </td>
                  <td>
                    <Link className="link" to={`/domains/${row.id}`}>{row.hostname}</Link>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      SSL: <span className={`badge ${row.sslStatus}`}>{row.sslStatus}</span>
                    </div>
                  </td>
                  <td>
                    <select
                      className="table-input table-input-template"
                      value={draft.templateKey}
                      onChange={(e) => onRowTemplateChange(row.id, e.target.value, row)}
                    >
                      {templates.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
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
