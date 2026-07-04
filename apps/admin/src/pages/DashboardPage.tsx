import { useEffect, useState } from "react";
import { api, defaultRange, formatRate } from "../lib/api";

interface Overview {
  totals: {
    pageViews: number;
    uniqueVisitorsSum: number;
    uniqueVisitorsDeduped: number;
    downloadCount: number;
    uniqueDownloadersSum: number;
    uniqueDownloadersDeduped: number;
    conversionRate: number;
    activeDomains: number;
  };
  items: Array<{ id: number; name: string; pageViews: number; uniqueVisitors: number; downloadCount: number; uniqueDownloaders: number; conversionRate: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const range = defaultRange(7);

  useEffect(() => {
    api<Overview>(`/api/admin/stats/overview?from=${range.from}&to=${range.to}&groupBy=domain`).then(setData).catch(console.error);
  }, []);

  const totals = data?.totals;

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">近 7 天全平台数据概览</p>
      <div className="card-grid">
        <div className="card"><div className="label">访问次数 (PV)</div><div className="value">{totals?.pageViews ?? "-"}</div></div>
        <div className="card"><div className="label">访问用户 (UV 合计)</div><div className="value">{totals?.uniqueVisitorsSum ?? "-"}</div></div>
        <div className="card"><div className="label">访问用户 (跨域去重)</div><div className="value">{totals?.uniqueVisitorsDeduped ?? "-"}</div></div>
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
              <th>访问次数</th>
              <th>访问用户</th>
              <th>下载次数</th>
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
