import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { DramaItem, GuideStep, LandingPageConfig } from "@lp-admin/shared";
import { api, previewUrl } from "../lib/api";

const emptyDrama = (): DramaItem => ({
  name: "",
  tag: "New",
  coverUrl: "/assets/drama-1.webp",
  gradientFrom: "#3a1c71",
  gradientTo: "#ff7a45",
});

const emptyStep = (): GuideStep => ({
  icon: "📥",
  title: "",
  description: "",
});

export default function LandingPageEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const [form, setForm] = useState<Partial<LandingPageConfig>>({
    locale: "en",
    status: "active",
    logoUrl: "/assets/logo.png",
    bannerUrl: "/assets/banner.avif",
    dramas: [emptyDrama()],
    installSteps: [emptyStep()],
  });
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; customerId: number }>>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Array<{ id: number; name: string }>>("/api/admin/customers"),
      api<Array<{ id: number; name: string; customerId: number }>>("/api/admin/products"),
    ]).then(([c, p]) => {
      setCustomers(c);
      setProducts(p);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (isNew) return;
    api<LandingPageConfig>(`/api/admin/landing-pages/${id}`).then(setForm).catch((e) => setError(String(e)));
  }, [id, isNew]);

  function setField<K extends keyof LandingPageConfig>(key: K, value: LandingPageConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await api("/api/admin/landing-pages", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/api/admin/landing-pages/${id}`, { method: "PUT", body: JSON.stringify(form) });
      }
      navigate("/landing-pages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = products.filter((p) => !form.customerId || p.customerId === form.customerId);

  return (
    <div>
      <div className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{isNew ? "新建落地页" : "编辑落地页"}</h1>
          <p className="muted">{form.name || "配置文案、下载链接、Pixel 等"}</p>
        </div>
        <div className="actions">
          {!isNew && form.id ? (
            <a className="btn btn-secondary" href={previewUrl(form.id)} target="_blank" rel="noreferrer">预览</a>
          ) : null}
          <Link className="btn btn-secondary" to="/landing-pages">返回列表</Link>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}

      <form className="panel form-grid" onSubmit={onSubmit}>
        <h2>基础信息</h2>
        <label>名称<input value={form.name ?? ""} onChange={(e) => setField("name", e.target.value)} required /></label>
        <label>客户<select value={form.customerId ?? ""} onChange={(e) => setField("customerId", Number(e.target.value))} required>
          <option value="">选择客户</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
        <label>产品<select value={form.productId ?? ""} onChange={(e) => setField("productId", Number(e.target.value))} required>
          <option value="">选择产品</option>
          {filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
        <label>语言<input value={form.locale ?? "en"} onChange={(e) => setField("locale", e.target.value)} /></label>
        <label>状态<select value={form.status ?? "active"} onChange={(e) => setField("status", e.target.value as "active" | "inactive")}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select></label>

        <h2>SEO & 品牌</h2>
        <label>页面 Title<input value={form.pageTitle ?? ""} onChange={(e) => setField("pageTitle", e.target.value)} required /></label>
        <label>Meta Description<textarea value={form.metaDescription ?? ""} onChange={(e) => setField("metaDescription", e.target.value)} required /></label>
        <label>品牌名<input value={form.brandName ?? ""} onChange={(e) => setField("brandName", e.target.value)} required /></label>
        <label>品牌副标题<input value={form.brandSubtitle ?? ""} onChange={(e) => setField("brandSubtitle", e.target.value)} required /></label>
        <label>Logo URL<input value={form.logoUrl ?? ""} onChange={(e) => setField("logoUrl", e.target.value)} required /></label>
        <label>Banner URL<input value={form.bannerUrl ?? ""} onChange={(e) => setField("bannerUrl", e.target.value)} required /></label>

        <h2>转化配置</h2>
        <label>奖励文案<input value={form.rewardText ?? ""} onChange={(e) => setField("rewardText", e.target.value)} required /></label>
        <label>下载链接<input value={form.downloadUrl ?? ""} onChange={(e) => setField("downloadUrl", e.target.value)} required /></label>
        <label>Facebook Pixel ID<input value={form.pixelId ?? ""} onChange={(e) => setField("pixelId", e.target.value)} required /></label>
        <label>Lead Storage Key<input value={form.leadStorageKey ?? ""} onChange={(e) => setField("leadStorageKey", e.target.value)} required /></label>

        <h2>Hero 区</h2>
        <label>标签<input value={form.heroTag ?? ""} onChange={(e) => setField("heroTag", e.target.value)} required /></label>
        <label>主标题<input value={form.heroTitle ?? ""} onChange={(e) => setField("heroTitle", e.target.value)} required /></label>
        <label>描述<textarea value={form.heroDescription ?? ""} onChange={(e) => setField("heroDescription", e.target.value)} required /></label>
        <label>CTA 按钮<input value={form.heroCtaText ?? ""} onChange={(e) => setField("heroCtaText", e.target.value)} required /></label>
        <label>安全徽章文案<input value={form.securityBadgeText ?? ""} onChange={(e) => setField("securityBadgeText", e.target.value)} required /></label>

        <h2>剧集区</h2>
        <label>区块标题<input value={form.dramasSectionTitle ?? ""} onChange={(e) => setField("dramasSectionTitle", e.target.value)} required /></label>
        <label>区块副标题<input value={form.dramasSectionSubtitle ?? ""} onChange={(e) => setField("dramasSectionSubtitle", e.target.value)} required /></label>
        {(form.dramas ?? []).map((drama, index) => (
          <div key={index} className="panel" style={{ background: "var(--panel-2)" }}>
            <strong>剧集 #{index + 1}</strong>
            <label>名称<input value={drama.name} onChange={(e) => {
              const dramas = [...(form.dramas ?? [])];
              dramas[index] = { ...dramas[index], name: e.target.value };
              setField("dramas", dramas);
            }} /></label>
            <label>标签<input value={drama.tag} onChange={(e) => {
              const dramas = [...(form.dramas ?? [])];
              dramas[index] = { ...dramas[index], tag: e.target.value };
              setField("dramas", dramas);
            }} /></label>
            <label>封面 URL<input value={drama.coverUrl} onChange={(e) => {
              const dramas = [...(form.dramas ?? [])];
              dramas[index] = { ...dramas[index], coverUrl: e.target.value };
              setField("dramas", dramas);
            }} /></label>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => setField("dramas", [...(form.dramas ?? []), emptyDrama()])}>+ 添加剧集</button>

        <h2>安装指南</h2>
        <label>标题<input value={form.installGuideTitle ?? ""} onChange={(e) => setField("installGuideTitle", e.target.value)} required /></label>
        <label>副标题<input value={form.installGuideSubtitle ?? ""} onChange={(e) => setField("installGuideSubtitle", e.target.value)} required /></label>
        {(form.installSteps ?? []).map((step, index) => (
          <div key={index} className="panel" style={{ background: "var(--panel-2)" }}>
            <strong>步骤 #{index + 1}</strong>
            <label>图标<input value={step.icon} onChange={(e) => {
              const installSteps = [...(form.installSteps ?? [])];
              installSteps[index] = { ...installSteps[index], icon: e.target.value };
              setField("installSteps", installSteps);
            }} /></label>
            <label>标题<input value={step.title} onChange={(e) => {
              const installSteps = [...(form.installSteps ?? [])];
              installSteps[index] = { ...installSteps[index], title: e.target.value };
              setField("installSteps", installSteps);
            }} /></label>
            <label>内容<textarea value={step.description} onChange={(e) => {
              const installSteps = [...(form.installSteps ?? [])];
              installSteps[index] = { ...installSteps[index], description: e.target.value };
              setField("installSteps", installSteps);
            }} /></label>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => setField("installSteps", [...(form.installSteps ?? []), emptyStep()])}>+ 添加步骤</button>

        <h2>底部 & 弹窗</h2>
        <label>Final 标题<input value={form.finalTitle ?? ""} onChange={(e) => setField("finalTitle", e.target.value)} required /></label>
        <label>Final 描述<textarea value={form.finalDescription ?? ""} onChange={(e) => setField("finalDescription", e.target.value)} required /></label>
        <label>Final CTA<input value={form.finalCtaText ?? ""} onChange={(e) => setField("finalCtaText", e.target.value)} required /></label>
        <label>Footer 文案<textarea value={form.footerText ?? ""} onChange={(e) => setField("footerText", e.target.value)} required /></label>
        <label>弹窗标题前缀<input value={form.modalTitlePrefix ?? ""} onChange={(e) => setField("modalTitlePrefix", e.target.value)} required /></label>
        <label>弹窗描述（可含 HTML）<textarea value={form.modalDescription ?? ""} onChange={(e) => setField("modalDescription", e.target.value)} required /></label>
        <label>弹窗 CTA<input value={form.modalCtaText ?? ""} onChange={(e) => setField("modalCtaText", e.target.value)} required /></label>
        <label>弹窗取消<input value={form.modalCancelText ?? ""} onChange={(e) => setField("modalCancelText", e.target.value)} required /></label>

        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "保存中..." : "保存"}</button>
      </form>
    </div>
  );
}
