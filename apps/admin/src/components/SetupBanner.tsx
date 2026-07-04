export default function SetupBanner() {
  return (
    <div className="notice">
      <strong>平台状态</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        • 管理后台：<code>admin.minishort.sbs</code> ✅
        <br />• API / 落地页：<code>minishort.sbs</code> ✅
        <br />• Cloudflare for SaaS：待开通（客户独立域名自动 SSL 需 Business+ 套餐）
        <br />• 客户域名 CNAME 目标：<code>customers.minishort.sbs</code>
      </p>
    </div>
  );
}
