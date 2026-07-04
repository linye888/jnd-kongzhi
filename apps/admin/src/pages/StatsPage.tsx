import { useEffect, useState } from "react";
import { api, defaultRange, formatRate } from "../lib/api";

type GroupBy = "domain" | "customer" | "product" | "landing_page";

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
  items: Array<{ id: number; name: string; domainCount?: number; pageViews: number; uniqueVisitors: number; downloadCount: number; uniqueDownloaders: number; conversionRate: number }>;
}

export default function StatsPage() {
  const initial = defaultRange(7);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupBy, setGroupBy] = useState<GroupBy>("domain");
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>(`/api/admin/stats/overview?from=${from}&to=${to}&groupBy=${groupBy}`).then(setData).catch(console.error);
  }, [from, to, groupBy]);

  return (
    <div>
      <h1>数据统计</h1>
      <div className="filters">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
          <option value="domain">按域名</option>
          <option value="customer">按客户</option>
          <option value="product">按产品</option>
          <option value="landing_page">按落地页</option>
        </select>
      </div>

      <div className="card-grid">
        <div className="card"><div className="label">访问次数</div><div className="value">{data?.totals.pageViews ?? 0}</div></div>
        <div className="card"><div className="label">访问用户 (合计)</div><div className="value">{data?.totals.uniqueVisitorsSum ?? 0}</div></div>
        <div className="card"><div className="label">访问用户 (去重)</div><div className="value">{data?.totals.uniqueVisitorsDeduped ?? 0}</div></div>
        <div className="card"><div className="label">下载次数</div><div className="value">{data?.totals.downloadCount ?? 0}</div></div>
        <div className="card"><div className="label">独立下载用户 (合计)</div><div className="value">{data?.totals.uniqueDownloadersSum ?? 0}</div></div>
        <div className="card"><div className="label">独立下载用户 (去重)</div><div className="value">{data?.totals.uniqueDownloadersDeduped ?? 0}</div></div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>域名数</th>
              <th>访问次数</th>
              <th>访问用户</th>
              <th>下载次数</th>
              <th>独立下载用户</th>
              <th>转化率</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item) => (
              <tr key={`${groupBy}-${item.id}`}>
                <td>{item.name}</td>
                <td>{item.domainCount ?? "-"}</td>
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
