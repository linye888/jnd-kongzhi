export default function SetupBanner() {
  return (
    <div className="notice">
      <strong>下一步：开通 Cloudflare for SaaS</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        • 平台登录 / 落地页 / 统计：已可用 ✅
        <br />• 客户独立域名自动 SSL：需在 Cloudflare 开通 for SaaS（Custom Hostnames）
        <br />• Fallback Origin：<code>origin.minishort.sbs</code> · 客户 CNAME 目标：<code>customers.minishort.sbs</code>
        <br />• 详见仓库 <code>docs/NEXT-STEPS.md</code>
      </p>
    </div>
  );
}
