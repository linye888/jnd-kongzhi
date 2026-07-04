import { Link } from "react-router-dom";

export default function SetupBanner() {
  return (
    <div className="notice">
      <strong>待完成配置（需 Cloudflare DNS 权限）：</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        在 <code>minishort.sbs</code> DNS：
        <br />• <code>admin</code> CNAME → <code>lp-admin-6rt.pages.dev</code> ✅ 已完成
        <br />• <code>minishort.sbs</code> / <code>origin</code>：<strong>不要</strong> CNAME 到 workers.dev（会 522）
        <br />• 请到 Workers → lp-admin-worker → 设置 → 域和路由 → 添加自定义域
        <br />for SaaS 可在控制台手动操作，<strong>不强制需要 API Token 权限</strong>
      </p>
    </div>
  );
}
