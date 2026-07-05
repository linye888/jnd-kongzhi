import { useEffect, useState } from "react";
import { api, formatRate } from "../lib/api";
import StatsPeriodFilter, { rangeForPeriod } from "../components/StatsPeriodFilter";
import type { StatsPeriod } from "../lib/date-range";
import { detectPeriod } from "../lib/date-range";

interface Overview {
  totals: {
    pageViews: number;
    uniqueVisitorsSum: number;
    uniqueVisitorsDeduped: number;
    botPageViews: number;
    botUniqueVisitorsDeduped: number;
    downloadCount: number;
    uniqueDownloadersSum: number;
    uniqueDownloadersDeduped: number;
    conversionRate: number;
    activeDomains: number;
  };
  items: Array<{
    id: number;
    name: string;
    domainCount?: number;
    pageViews: number;
    uniqueVisitors: number;
    botPageViews: number;
    botUniqueVisitors: number;
    downloadCount: number;
    uniqueDownloaders: number;
    conversionRate: number;
  }>;
}

interface StorageSummary {
  totalEvents: number;
  totalDailyRows: number;
  oldestEventAt: string | null;
  newestEventAt: string | null;
}

interface DomainOption {
  id: number;
  hostname: string;
}

type PurgeMode = "before" | "range" | "all";

interface PurgePreview {
  eventsCount: number;
  dailyRowsCount: number;
}

export default function StatsPage() {
  const initial = rangeForPeriod("week");
  const [period, setPeriod] = useState<StatsPeriod | null>("week");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Overview | null>(null);
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [purgeMode, setPurgeMode] = useState<PurgeMode>("before");
  const [purgeBefore, setPurgeBefore] = useState(() => {
    const d = new Date(Date.now() - 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [purgeFrom, setPurgeFrom] = useState(from);
  const [purgeTo, setPurgeTo] = useState(to);
  const [purgeDomainId, setPurgeDomainId] = useState("");
  const [purgePreview, setPurgePreview] = useState<PurgePreview | null>(null);
  const [purging, setPurging] = useState(false);

  async function loadStats() {
    const overview = await api<Overview>(`/api/admin/stats/overview?from=${from}&to=${to}&groupBy=domain`);
    setData(overview);
  }

  async function loadStorage() {
    setStorage(await api<StorageSummary>("/api/admin/stats/storage"));
  }

  useEffect(() => {
    loadStats().catch((e) => setError(String(e)));
  }, [from, to]);

  useEffect(() => {
    Promise.all([
      loadStorage(),
      api<DomainOption[]>("/api/admin/domains?lite=1").then(setDomains),
    ]).catch(console.error);
  }, []);

  function onPeriodChange(next: StatsPeriod) {
    const range = rangeForPeriod(next);
    setPeriod(next);
    setFrom(range.from);
    setTo(range.to);
  }

  function onCustomChange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setPeriod(detectPeriod(nextFrom, nextTo));
  }

  function buildPurgePayload() {
    const domainId = purgeDomainId ? Number(purgeDomainId) : undefined;
    if (purgeMode === "all") return { mode: "all" as const, domainId };
    if (purgeMode === "before") return { mode: "before" as const, before: purgeBefore, domainId };
    return { mode: "range" as const, from: purgeFrom, to: purgeTo, domainId };
  }

  async function previewPurge() {
    setError("");
    setMessage("");
    try {
      const preview = await api<PurgePreview>("/api/admin/stats/purge/preview", {
        method: "POST",
        body: JSON.stringify(buildPurgePayload()),
      });
      setPurgePreview(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "预览失败");
    }
  }

  async function executePurge() {
    const preview = purgePreview ?? await api<PurgePreview>("/api/admin/stats/purge/preview", {
      method: "POST",
      body: JSON.stringify(buildPurgePayload()),
    });

    const scope = purgeDomainId
      ? domains.find((d) => String(d.id) === purgeDomainId)?.hostname
      : "全部域名";
    const text =
      purgeMode === "all"
        ? `确定删除 ${scope} 的全部历史数据？\n\n事件 ${preview.eventsCount} 条，日统计 ${preview.dailyRowsCount} 条`
        : purgeMode === "before"
          ? `确定删除 ${scope} 在 ${purgeBefore} 之前的数据？\n\n事件 ${preview.eventsCount} 条，日统计 ${preview.dailyRowsCount} 条`
          : `确定删除 ${scope} 在 ${purgeFrom} ~ ${purgeTo} 的数据？\n\n事件 ${preview.eventsCount} 条，日统计 ${preview.dailyRowsCount} 条`;

    if (!confirm(text)) return;

    setPurging(true);
    setError("");
    try {
      const result = await api<PurgePreview & { deletedEvents: number; deletedDailyRows: number }>(
        "/api/admin/stats/purge",
        { method: "POST", body: JSON.stringify(buildPurgePayload()) },
      );
      setMessage(`已删除事件 ${result.deletedEvents} 条、日统计 ${result.deletedDailyRows} 条`);
      setPurgePreview(null);
      await Promise.all([loadStats(), loadStorage()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setPurging(false);
    }
  }

  const totals = data?.totals;
  const periodLabel = period ? rangeForPeriod(period).label : `${from} ~ ${to}`;

  return (
    <div>
      <h1>数据统计</h1>
      <p className="muted">当前查看：{periodLabel} · 访问次数默认统计真实用户</p>

      {message ? <div className="notice" style={{ marginBottom: 12 }}>{message}</div> : null}
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <StatsPeriodFilter
        period={period}
        from={from}
        to={to}
        onPeriodChange={onPeriodChange}
        onCustomChange={onCustomChange}
      />

      <div className="card-grid">
        <div className="card"><div className="label">真实访问 (PV)</div><div className="value">{totals?.pageViews ?? 0}</div></div>
        <div className="card"><div className="label">真实用户 (UV 去重)</div><div className="value">{totals?.uniqueVisitorsDeduped ?? 0}</div></div>
        <div className="card"><div className="label">疑似机器人 (PV)</div><div className="value">{totals?.botPageViews ?? 0}</div></div>
        <div className="card"><div className="label">疑似机器人 (UV)</div><div className="value">{totals?.botUniqueVisitorsDeduped ?? 0}</div></div>
        <div className="card"><div className="label">下载次数</div><div className="value">{totals?.downloadCount ?? 0}</div></div>
        <div className="card"><div className="label">转化率</div><div className="value">{formatRate(totals?.conversionRate ?? 0)}</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>域名</th>
              <th>真实 PV</th>
              <th>真实 UV</th>
              <th>疑似机器人 PV</th>
              <th>下载</th>
              <th>独立下载用户</th>
              <th>转化率</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.pageViews}</td>
                <td>{item.uniqueVisitors}</td>
                <td><span className="badge pending">{item.botPageViews}</span></td>
                <td>{item.downloadCount}</td>
                <td>{item.uniqueDownloaders}</td>
                <td>{formatRate(item.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>历史数据管理</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          当前库内：事件 {storage?.totalEvents ?? 0} 条，日统计 {storage?.totalDailyRows ?? 0} 条
          {storage?.oldestEventAt ? ` · 最早 ${storage.oldestEventAt.slice(0, 10)}` : ""}
        </p>

        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label>
            删除范围
            <select value={purgeMode} onChange={(e) => setPurgeMode(e.target.value as PurgeMode)}>
              <option value="before">删除某日期之前</option>
              <option value="range">删除日期区间</option>
              <option value="all">删除全部历史</option>
            </select>
          </label>
          <label>
            限定域名（可选）
            <select value={purgeDomainId} onChange={(e) => setPurgeDomainId(e.target.value)}>
              <option value="">全部域名</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.hostname}</option>
              ))}
            </select>
          </label>
          {purgeMode === "before" ? (
            <label>
              删除此日期之前
              <input type="date" value={purgeBefore} onChange={(e) => setPurgeBefore(e.target.value)} />
            </label>
          ) : null}
          {purgeMode === "range" ? (
            <>
              <label>开始日期<input type="date" value={purgeFrom} onChange={(e) => setPurgeFrom(e.target.value)} /></label>
              <label>结束日期<input type="date" value={purgeTo} onChange={(e) => setPurgeTo(e.target.value)} /></label>
            </>
          ) : null}
        </div>

        {purgePreview ? (
          <p className="muted">
            将删除：事件 {purgePreview.eventsCount} 条，日统计 {purgePreview.dailyRowsCount} 条
          </p>
        ) : null}

        <div className="actions">
          <button className="btn btn-secondary" onClick={previewPurge}>预览删除数量</button>
          <button className="btn btn-danger" disabled={purging} onClick={executePurge}>
            {purging ? "删除中…" : "删除历史数据"}
          </button>
        </div>
      </div>
    </div>
  );
}
