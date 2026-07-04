import { Link } from "react-router-dom";

export default function SetupBanner() {
  return (
    <div className="notice">
      <strong>待完成配置（需 Cloudflare DNS 权限）：</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        在 <code>minishort.sbs</code> DNS 添加：
        <br />• <code>admin</code> CNAME → <code>lp-admin-6rt.pages.dev</code>（管理后台）
        <br />• <code>origin</code> CNAME → <code>lp-admin-worker.ceddnabby.workers.dev</code>（Fallback Origin）
        <br />• <code>customers</code> CNAME → Cloudflare SaaS 目标（for SaaS 开通后）
        <br />API Token 还需 Zone 权限：<code>DNS Edit</code> + <code>SSL and Certificates Edit</code>
        <br />请尽快 <Link to="/users" style={{ color: "var(--mint)" }}>修改默认管理员密码</Link>
      </p>
    </div>
  );
}
