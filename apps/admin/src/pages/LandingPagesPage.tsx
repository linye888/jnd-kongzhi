import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface LandingPage {
  id: number;
  name: string;
  locale: string;
  status: string;
  rewardText: string;
  downloadUrl: string;
  pixelId: string;
}

export default function LandingPagesPage() {
  const [rows, setRows] = useState<LandingPage[]>([]);

  async function load() {
    setRows(await api<LandingPage[]>("/api/admin/landing-pages"));
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function duplicate(id: number) {
    await api(`/api/admin/landing-pages/${id}/duplicate`, { method: "POST" });
    await load();
  }

  return (
    <div>
      <h1>落地页管理</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>语言</th>
              <th>状态</th>
              <th>奖励</th>
              <th>Pixel ID</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.locale}</td>
                <td>{row.status}</td>
                <td>{row.rewardText}</td>
                <td>{row.pixelId}</td>
                <td className="actions">
                  <a className="btn btn-secondary" href={`/api/admin/landing-pages/${row.id}/preview`} target="_blank" rel="noreferrer">预览</a>
                  <button className="btn btn-secondary" onClick={() => duplicate(row.id)}>复制</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
