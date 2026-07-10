import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlatformConfig } from "@lp-admin/shared";
import { getPlatformConfig, isSelfHosted } from "../lib/platform-config";

const checklist = [
  "健康检测显示「正常」",
  "访问落地页能看到完整页面",
  "下载按钮跳转到正确链接",
  "Pixel 在浏览器插件中可检测到",
  "Dashboard 有 PV / 独立下载用户数据（有真实访问后）",
];

export default function DomainGuidePage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPlatformConfig().then(setConfig).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!config) return <p className="muted">加载配置中…</p>;

  const selfHosted = isSelfHosted(config);
  const serverTarget = config.serverIp ?? config.platformZone;
  const zone = config.platformZone;

  const platformSteps = selfHosted
    ? [
        "打开「域名管理」，选择落地页模板",
        `域名填写子域名，例如 india.${isIp(zone) ? "yourdomain.com" : zone}`,
        `在 DNS 添加 A 记录指向服务器 IP：${serverTarget}`,
        "填写下载链接和 Facebook Pixel ID，点击「添加」",
        "等待 DNS 生效后点击「重新检测」，确认显示绿色「正常」",
        isIp(zone) ? `广告落地页可用 http://你的域名` : `广告落地页填：https://你的子域名`,
      ]
    : [
        "打开「域名管理」，在上方表单选择落地页模板",
        `域名填写子域名，例如 india.${zone} 或 brazil.${zone}`,
        "填写该域名专用的下载链接和 Facebook Pixel ID",
        "点击「添加」，等待 1～5 分钟（平台自动绑定 Worker）",
        "在列表中点击「重新检测」，确认显示绿色「正常」",
        `Facebook 广告落地页填：https://你的子域名.${zone}`,
      ];

  const customSteps = selfHosted
    ? [
        `在域名服务商（阿里云/腾讯云/Cloudflare 等）管理 DNS`,
        `添加 A 记录：@ → ${serverTarget}（根域名）`,
        `如有 www，添加 A 记录：www → ${serverTarget}`,
        "回到本后台「域名管理」，添加相同 hostname + 模板 + 下载链接 + Pixel",
        "DNS 生效后执行：sudo certbot --nginx -d 你的域名（开启 HTTPS）",
        "点击「重新检测」并访问落地页确认正常",
      ]
    : [
        "将域名（如 minishort.top）接入 Cloudflare，等待 NS 生效",
        `在 DNS 添加 CNAME：@ 或 www → ${config.fallbackOrigin}，开启橙云 ☁️`,
        "SSL/TLS 模式选「灵活」或「完全」，等待证书生效（约 5～15 分钟）",
        "回到本后台「域名管理」，添加相同 hostname + 模板 + 下载链接 + Pixel",
        "点击「重新检测」并访问 https://你的域名 确认落地页正常",
        "Facebook 广告落地页填：https://你的域名",
      ];

  const dnsRows = selfHosted
    ? [
        { type: "A", name: "@", target: serverTarget, proxy: "—", note: "根域名" },
        { type: "A", name: "www", target: serverTarget, proxy: "—", note: "www 子域（可选）" },
        { type: "A", name: "promo", target: serverTarget, proxy: "—", note: "投放子域（可选）" },
      ]
    : [
        { type: "CNAME", name: "@", target: config.fallbackOrigin, proxy: "已代理 ☁️", note: "根域名" },
        { type: "CNAME", name: "www", target: config.fallbackOrigin, proxy: "已代理 ☁️", note: "www 子域" },
        { type: "CNAME", name: "ad", target: config.fallbackOrigin, proxy: "已代理 ☁️", note: "投放子域（可选）" },
      ];

  return (
    <div>
      <div className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>添加域名引导</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            {selfHosted
              ? `当前为 Ubuntu 自托管模式，域名需 A 记录解析到 ${serverTarget}`
              : "当前为 Cloudflare 模式，按步骤完成 DNS（如有）和后台配置"}
          </p>
        </div>
        <Link className="btn btn-primary" to="/domains">
          去添加域名
        </Link>
      </div>

      <div className="guide-grid">
        <div className={`panel guide-card ${selfHosted ? "" : "guide-card-recommended"}`}>
          {!selfHosted ? <div className="guide-badge">推荐</div> : null}
          <h2>方式 A：{selfHosted ? "平台子域名" : "平台子域名"}</h2>
          <p className="muted">
            {selfHosted ? "需添加 A 记录到服务器 IP" : "零 DNS 配置，适合快速测试和投放"}
          </p>
          <ol className="guide-steps">
            {platformSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className={`panel guide-card ${selfHosted ? "guide-card-recommended" : ""}`}>
          {selfHosted ? <div className="guide-badge">推荐</div> : null}
          <h2>方式 B：自有域名</h2>
          <p className="muted">
            {selfHosted ? "品牌独立域名，A 记录指向本服务器" : "适合品牌独立域名，需先在 Cloudflare 配 DNS"}
          </p>
          <ol className="guide-steps">
            {customSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>
          {selfHosted ? "DNS 配置（A 记录）" : "自有域名 DNS 配置（Cloudflare）"}
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {selfHosted
            ? `所有域名/子域名均需 A 记录指向服务器 IP：${serverTarget}`
            : `CNAME 目标必须为 ${config.fallbackOrigin}，且必须开启代理（橙云 ☁️）`}
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>类型</th>
              <th>名称</th>
              <th>目标</th>
              <th>代理</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {dnsRows.map((row) => (
              <tr key={row.name}>
                <td>{row.type}</td>
                <td><code>{row.name}</code></td>
                <td><code>{row.target}</code></td>
                <td>{row.proxy}</td>
                <td className="muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>后台添加时要填的 4 项</h2>
        <table className="table">
          <thead>
            <tr>
              <th>字段</th>
              <th>说明</th>
              <th>示例</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>落地页模板</td>
              <td>决定页面语言和默认文案</td>
              <td>Mini Short - 印度英语 / 墨西哥西语</td>
            </tr>
            <tr>
              <td>域名</td>
              <td>与 DNS / 广告链接完全一致</td>
              <td><code>promo.example.com</code></td>
            </tr>
            <tr>
              <td>下载链接</td>
              <td>该域名专属 APK 地址</td>
              <td><code>https://...</code></td>
            </tr>
            <tr>
              <td>Pixel ID</td>
              <td>Facebook Pixel</td>
              <td><code>4377607675843081</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="notice" style={{ marginTop: 16 }}>
        <strong>添加后检查清单</strong>
        <ul className="guide-checklist">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="actions" style={{ marginTop: 20 }}>
        <Link className="btn btn-primary" to="/domains">
          前往域名管理
        </Link>
        <Link className="btn btn-secondary" to="/">
          返回 Dashboard
        </Link>
      </div>
    </div>
  );
}

function isIp(value: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}
