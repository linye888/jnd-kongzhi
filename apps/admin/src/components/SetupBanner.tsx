import type { PlatformConfig } from "@lp-admin/shared";

interface Props {
  config: PlatformConfig;
}

export default function SetupBanner({ config }: Props) {
  if (config.deployTarget === "self-hosted") {
    const ip = config.serverIp ?? config.platformZone;
    return (
      <div className="notice">
        <strong>Ubuntu 自托管模式</strong>
        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
          • 所有域名需在 DNS 添加 <strong>A 记录</strong> 指向 <code>{ip}</code>
          <br />• 后台添加域名后，等待 DNS 生效，再点击「重新检测」
          <br />• HTTPS 需绑定域名后执行 <code>sudo certbot --nginx -d 你的域名</code>
        </p>
      </div>
    );
  }

  return (
    <div className="notice">
      <strong>Cloudflare 模式（方案 A）</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
        • 平台子域（如 <code>xxx.{config.platformZone}</code>）：添加后自动绑定 Worker，无需 DNS ✅
        <br />• 客户自有域：CNAME 橙云 → <code>{config.fallbackOrigin}</code>，证书在客户 CF 自动签发
      </p>
    </div>
  );
}
