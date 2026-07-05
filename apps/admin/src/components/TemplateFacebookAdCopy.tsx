import { useState } from "react";
import type { LandingTemplateOption } from "@lp-admin/shared";

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-copy" onClick={copy}>
      {copied ? "已复制" : `复制${label}`}
    </button>
  );
}

function AdBlock({ template, compact }: { template: LandingTemplateOption; compact?: boolean }) {
  return (
    <div className={`fb-ad-block${compact ? " fb-ad-block-compact" : ""}`}>
      <div className="fb-ad-block-header">
        <strong>{template.name}</strong>
        <span className="muted">{template.description}</span>
      </div>
      <div className="fb-ad-field">
        <div className="fb-ad-label">标题（Headline）</div>
        <div className="fb-ad-value">{template.facebookAdHeadline}</div>
        <CopyButton label="标题" text={template.facebookAdHeadline} />
      </div>
      <div className="fb-ad-field">
        <div className="fb-ad-label">正文（Primary Text）</div>
        <pre className="fb-ad-value fb-ad-pre">{template.facebookAdPrimaryText}</pre>
        <CopyButton label="正文" text={template.facebookAdPrimaryText} />
      </div>
      <div className="fb-ad-field">
        <div className="fb-ad-label">描述（Description，可选）</div>
        <div className="fb-ad-value">{template.facebookAdDescription}</div>
        <CopyButton label="描述" text={template.facebookAdDescription} />
      </div>
    </div>
  );
}

export function TemplateFacebookAdCopyPanel({
  templates,
  selectedId,
  showAll = false,
}: {
  templates: LandingTemplateOption[];
  selectedId?: string;
  showAll?: boolean;
}) {
  if (templates.length === 0) return null;

  const selected = templates.find((item) => item.id === selectedId);

  if (showAll) {
    return (
      <div className="fb-ad-panel">
        <h3 className="fb-ad-panel-title">Facebook 广告素材（按模板）</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          投放时在 Meta 广告管理器对应字段粘贴即可。CTA 建议选「Download」或「Learn More」。
        </p>
        <div className="fb-ad-grid">
          {templates.map((template) => (
            <AdBlock key={template.id} template={template} />
          ))}
        </div>
      </div>
    );
  }

  if (!selected) return null;

  return (
    <div className="fb-ad-panel fb-ad-panel-inline">
      <h3 className="fb-ad-panel-title">Facebook 广告素材 · {selected.name}</h3>
      <AdBlock template={selected} compact />
    </div>
  );
}
