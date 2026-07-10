import type { DomainSetupGuide } from "@lp-admin/shared";

interface Props {
  guide: DomainSetupGuide;
  compact?: boolean;
}

export default function DomainSetupGuidePanel({ guide, compact }: Props) {
  const selfHosted = guide.deployTarget === "self-hosted";

  return (
    <div className="notice" style={{ marginBottom: compact ? 0 : 12 }}>
      <strong>
        {selfHosted
          ? guide.kind === "platform_subdomain"
            ? "平台子域名（Ubuntu 自托管）"
            : "自有域名（Ubuntu 自托管）"
          : guide.kind === "platform_subdomain"
            ? "平台子域名（自动配置）"
            : "客户自有域名（方案 A）"}
      </strong>
      {guide.note ? <p className="muted" style={{ margin: "8px 0 0" }}>{guide.note}</p> : null}
      <ol style={{ margin: "12px 0 0", paddingLeft: 20, lineHeight: 1.7 }}>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {selfHosted ? (
        <p style={{ margin: "12px 0 0", fontSize: 13 }}>
          DNS 解析目标（A 记录）：<code>{guide.originTarget}</code>
        </p>
      ) : guide.kind === "customer_owned" ? (
        <p style={{ margin: "12px 0 0", fontSize: 13 }}>
          CNAME 目标：<code>{guide.originTarget}</code>（橙云 ☁️） · 完整说明见 <code>docs/CUSTOMER-DNS.md</code>
        </p>
      ) : null}
    </div>
  );
}
