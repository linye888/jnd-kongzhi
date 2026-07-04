export default function SetupBanner() {
  return (
    <div className="notice">
      <strong>方案 A 已启用（Free + 客户自有 Cloudflare）</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        • 平台子域（如 <code>xxx.minishort.sbs</code>）：添加后自动绑定 Worker，无需 DNS ✅
        <br />• 客户自有域：客户 CNAME 橙云 → <code>origin.minishort.sbs</code>，证书在客户 CF 自动签发
        <br />• 发给客户的 DNS 说明见 <code>docs/CUSTOMER-DNS.md</code> · 管理员说明见 <code>docs/PLAN-A.md</code>
      </p>
    </div>
  );
}
