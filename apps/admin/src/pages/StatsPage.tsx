import { useEffect, useState } from "react";
import { api, defaultRange, formatRate } from "../lib/api";

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

export default function StatsPage() {
  const initial = defaultRange(7);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>(`/api/admin/stats/overview?from=${from}&to=${to}&groupBy=domain`).then(setData).catch(console.error);
  }, [from, to]);

  const totals = data?.totals;

  return (
    <div>
      <h1>数据统计</h1>
      <p className="muted">访问次数默认统计真实用户；疑似机器人单独展示</p>
      <div className="filters">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="card-grid">
        <div className="card"><div className="label">真实访问 (PV)</div><div className="value">{totals?.pageViews ?? 0}</div></div>
        <div className="card"><div className="label">真实用户 (UV 去重)</div><div className="value">{totals?.uniqueVisitorsDeduped ?? 0}</div></div>
        <div className="card"><div className="label">疑似机器人 (PV)</div><div className="value">{totals?.botPageViews ?? 0}</div></div>
        <div className="card"><div className="label">疑似机器人 (UV)</div><div className="value">{totals?.botUniqueVisitorsDeduped ?? 0}</div></div>
        <div className="card"><div className="label">下载次数</div><div className="value">{totals?.downloadCount ?? 0}</div></div>
        <div className="card"><div className="label">转化率</div><div className="value">{formatRate(totals?.conversionRate ?? 0)}</div></div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>域名数</th>
              <th>真实 PV</th>
              <th>真实 UV</th>
              <th>疑似机器人 PV</th>
              <th>下载</th>
              <th>转化率</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.domainCount ?? "-"}</td>
                <td>{item.pageViews}</td>
                <td>{item.uniqueVisitors}</td>
                <td><span className="badge pending">{item.botPageViews}</span></td>
                <td>{item.downloadCount}</td>
                <td>{formatRate(item.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
