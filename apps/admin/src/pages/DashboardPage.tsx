import { useEffect, useState } from "react";
import { api, formatRate } from "../lib/api";
import StatsPeriodFilter, { rangeForPeriod } from "../components/StatsPeriodFilter";
import type { StatsPeriod } from "../lib/date-range";
import { detectPeriod } from "../lib/date-range";

interface Overview {
  totals: {
    pageViews: number;
    uniqueVisitorsDeduped: number;
    botPageViews: number;
    downloadCount: number;
    uniqueDownloadersSum: number;
    conversionRate: number;
  };
  items: Array<{
    id: number;
    name: string;
    pageViews: number;
    uniqueVisitors: number;
    botPageViews: number;
    downloadCount: number;
    uniqueDownloaders: number;
    conversionRate: number;
  }>;
}

export default function DashboardPage() {
  const [from, setFrom] = useState(rangeForPeriod("week").from);
  const [to, setTo] = useState(rangeForPeriod("week").to);
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>(`/api/admin/stats/overview?from=${from}&to=${to}&groupBy=domain`).then(setData).catch(console.error);
  }, [from, to]);

  function onPeriodChange(next: StatsPeriod) {
    const range = rangeForPeriod(next);
    setFrom(range.from);
    setTo(range.to);
  }

  function onCustomChange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
  }

  const totals = data?.totals;
  const activePeriod = detectPeriod(from, to);
  const periodLabel = activePeriod ? rangeForPeriod(activePeriod).label : `${from} ~ ${to}`;

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">{periodLabel}真实用户数据（已过滤大部分爬虫）</p>

      <StatsPeriodFilter
        period={activePeriod}
        from={from}
        to={to}
        onPeriodChange={onPeriodChange}
        onCustomChange={onCustomChange}
      />

      <div className="card-grid">
        <div className="card"><div className="label">真实访问 (PV)</div><div className="value">{totals?.pageViews ?? "-"}</div></div>
        <div className="card"><div className="label">真实用户 (UV)</div><div className="value">{totals?.uniqueVisitorsDeduped ?? "-"}</div></div>
        <div className="card"><div className="label">疑似机器人 (PV)</div><div className="value">{totals?.botPageViews ?? "-"}</div></div>
        <div className="card"><div className="label">下载次数</div><div className="value">{totals?.downloadCount ?? "-"}</div></div>
        <div className="card"><div className="label">独立下载用户</div><div className="value">{totals?.uniqueDownloadersSum ?? "-"}</div></div>
        <div className="card"><div className="label">转化率</div><div className="value">{totals ? formatRate(totals.conversionRate) : "-"}</div></div>
      </div>

      <div className="panel">
        <h2>Top 域名（按下载次数）</h2>
        <table className="table">
          <thead>
            <tr>
              <th>域名</th>
              <th>真实 PV</th>
              <th>真实 UV</th>
              <th>疑似机器人</th>
              <th>下载</th>
              <th>独立下载用户</th>
              <th>转化率</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).slice(0, 10).map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.pageViews}</td>
                <td>{item.uniqueVisitors}</td>
                <td>{item.botPageViews}</td>
                <td>{item.downloadCount}</td>
                <td>{item.uniqueDownloaders}</td>
                <td>{formatRate(item.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
