import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DomainSetupGuide, DomainStatsDaily, DownloadByPosition } from "@lp-admin/shared";
import { api, formatRate } from "../lib/api";
import StatsPeriodFilter, { rangeForPeriod } from "../components/StatsPeriodFilter";
import { detectPeriod } from "../lib/date-range";

interface DomainInfo {
  id: number;
  hostname: string;
  downloadUrl: string;
  pixelId: string;
  status: string;
  sslStatus: string;
  setup?: DomainSetupGuide;
}

interface DomainStatsResponse {
  summary: {
    pageViews: number;
    uniqueVisitors: number;
    botPageViews?: number;
    downloadCount: number;
    uniqueDownloaders: number;
    conversionRate: number;
  };
  daily: DomainStatsDaily[];
  downloadByPosition: DownloadByPosition;
}

const positionLabels: Record<keyof DownloadByPosition, string> = {
  hero: "Hero 按钮",
  footer: "底部按钮",
  drama_modal: "剧集弹窗",
};

export default function DomainDetailPage() {
  const { id } = useParams();
  const initial = rangeForPeriod("week");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [domain, setDomain] = useState<DomainInfo | null>(null);
  const [stats, setStats] = useState<DomainStatsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<DomainInfo>(`/api/admin/domains/${id}`).then(setDomain).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api<DomainStatsResponse>(`/api/admin/stats/domains/${id}?from=${from}&to=${to}`)
      .then(setStats)
      .catch((e) => setError(String(e)));
  }, [id, from, to]);

  const summary = stats?.summary;
  const maxPv = Math.max(...(stats?.daily.map((d) => d.pageViews) ?? [1]), 1);
  const maxDownloads = Math.max(...(stats?.daily.map((d) => d.downloadCount) ?? [1]), 1);
  const positions = stats?.downloadByPosition;

  return (
    <div>
      <div className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <Link className="muted" to="/domains">← 返回域名列表</Link>
          <h1 style={{ margin: "8px 0 0" }}>{domain?.hostname ?? "域名详情"}</h1>
          {domain ? (
            <p className="muted" style={{ margin: "6px 0 0", wordBreak: "break-all" }}>
              下载链接：{domain.downloadUrl} · Pixel：{domain.pixelId}
            </p>
          ) : null}
        </div>
        {domain ? (
          <a className="btn btn-secondary" href={`https://${domain.hostname}`} target="_blank" rel="noreferrer">
            访问落地页
          </a>
        ) : null}
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      {domain ? (
        <div className="card-grid" style={{ marginBottom: 16 }}>
          <div className="card"><div className="label">状态</div><div className="value" style={{ fontSize: 18 }}>{domain.status}</div></div>
          <div className="card"><div className="label">SSL</div><div className="value" style={{ fontSize: 18 }}><span className={`badge ${domain.sslStatus}`}>{domain.sslStatus}</span></div></div>
        </div>
      ) : null}

      <StatsPeriodFilter
        period={detectPeriod(from, to)}
        from={from}
        to={to}
        onPeriodChange={(next) => {
          const range = rangeForPeriod(next);
          setFrom(range.from);
          setTo(range.to);
        }}
        onCustomChange={(nextFrom, nextTo) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
      />

      <div className="card-grid">
        <div className="card"><div className="label">真实访问 (PV)</div><div className="value">{summary?.pageViews ?? 0}</div></div>
        <div className="card"><div className="label">真实用户 (UV)</div><div className="value">{summary?.uniqueVisitors ?? 0}</div></div>
        <div className="card"><div className="label">疑似机器人 (PV)</div><div className="value">{summary?.botPageViews ?? 0}</div></div>
        <div className="card"><div className="label">下载次数</div><div className="value">{summary?.downloadCount ?? 0}</div></div>
        <div className="card"><div className="label">独立下载用户</div><div className="value">{summary?.uniqueDownloaders ?? 0}</div></div>
        <div className="card"><div className="label">转化率</div><div className="value">{formatRate(summary?.conversionRate ?? 0)}</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>每日访问趋势</h2>
        <div className="chart">
          {(stats?.daily ?? []).map((day) => (
            <div key={day.date} className="chart-row">
              <div className="chart-label">{day.date.slice(5)}</div>
              <div className="chart-bar-wrap">
                <div className="chart-bar chart-bar-pv" style={{ width: `${(day.pageViews / maxPv) * 100}%` }} title={`PV ${day.pageViews}`} />
              </div>
              <div className="chart-num">{day.pageViews}</div>
            </div>
          ))}
          {(stats?.daily.length ?? 0) === 0 ? <p className="muted">暂无数据</p> : null}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>每日下载趋势</h2>
        <div className="chart">
          {(stats?.daily ?? []).map((day) => (
            <div key={`dl-${day.date}`} className="chart-row">
              <div className="chart-label">{day.date.slice(5)}</div>
              <div className="chart-bar-wrap">
                <div className="chart-bar chart-bar-dl" style={{ width: `${(day.downloadCount / maxDownloads) * 100}%` }} title={`下载 ${day.downloadCount}`} />
              </div>
              <div className="chart-num">{day.downloadCount}</div>
            </div>
          ))}
        </div>
      </div>

      {positions ? (
        <div className="panel">
          <h2>下载按钮分布</h2>
          <div className="chart">
            {(Object.keys(positionLabels) as Array<keyof DownloadByPosition>).map((key) => {
              const max = Math.max(positions.hero, positions.footer, positions.drama_modal, 1);
              return (
                <div key={key} className="chart-row">
                  <div className="chart-label">{positionLabels[key]}</div>
                  <div className="chart-bar-wrap">
                    <div className="chart-bar chart-bar-dl" style={{ width: `${(positions[key] / max) * 100}%` }} />
                  </div>
                  <div className="chart-num">{positions[key]}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
