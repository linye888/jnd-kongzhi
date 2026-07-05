import { Link } from "react-router-dom";

const ORIGIN_TARGET = "origin.minishort.sbs";

const platformSteps = [
  "打开「域名管理」，在上方表单选择落地页模板",
  "域名填写子域名，例如 india.minishort.sbs 或 brazil.minishort.sbs",
  "填写该域名专用的下载链接和 Facebook Pixel ID",
  "点击「添加」，等待 1～5 分钟（平台自动绑定 Worker）",
  "在列表中点击「重新检测」，确认显示绿色「正常」",
  "Facebook 广告落地页填：https://你的子域名.minishort.sbs",
];

const sameAccountSteps = [
  "若域名和 minishort.sbs 在同一个 Cloudflare 账号（如 minishort.top），不要用 CNAME → origin",
  "删除 @ / www 指向 origin.minishort.sbs 的 CNAME 记录",
  "在 Cloudflare → Workers → lp-admin-worker → 域和路由 → 添加自定义域：minishort.top 和 www.minishort.top",
  "Cloudflare 会自动创建 DNS 并签发证书",
  "在后台「域名管理」添加 minishort.top + 模板 + 下载链接 + Pixel",
  "访问 https://minishort.top 测试",
];

const customSteps = [
  "将域名接入 Cloudflare（与 minishort.sbs 不同账号时适用），等待 NS 生效",
  `在 DNS 添加 CNAME：@ 或 www → ${ORIGIN_TARGET}，开启橙云 ☁️`,
  "SSL/TLS 模式选「灵活」或「完全」，等待证书生效（约 5～15 分钟）",
  "回到本后台「域名管理」，添加相同 hostname + 模板 + 下载链接 + Pixel",
  "点击「重新检测」并访问 https://你的域名 确认落地页正常",
  "Facebook 广告落地页填：https://你的域名",
];

const dnsRows = [
  { name: "@", target: ORIGIN_TARGET, note: "根域名 minishort.top" },
  { name: "www", target: ORIGIN_TARGET, note: "www.minishort.top" },
  { name: "ad", target: ORIGIN_TARGET, note: "子域名 ad.minishort.top（可选）" },
];

const checklist = [
  "健康检测显示「正常」",
  "访问落地页能看到完整页面",
  "下载按钮跳转到正确链接",
  "Pixel 在浏览器插件中可检测到",
  "Dashboard 有 PV / 独立下载用户数据（有真实访问后）",
];

export default function DomainGuidePage() {
  return (
    <div>
      <div className="topbar" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>添加域名引导</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            选择适合你的方式，按步骤完成 DNS（如有）和后台配置
          </p>
        </div>
        <Link className="btn btn-primary" to="/domains">
          去添加域名
        </Link>
      </div>

      <div className="guide-grid">
        <div className="panel guide-card guide-card-recommended">
          <div className="guide-badge">推荐</div>
          <h2>方式 A：平台子域名</h2>
          <p className="muted">零 DNS 配置，适合快速测试和投放</p>
          <p>
            示例：<code>india.minishort.sbs</code> · <code>brazil.minishort.sbs</code>
          </p>
          <ol className="guide-steps">
            {platformSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="panel guide-card">
          <h2>方式 B：同账号自有域名</h2>
          <p className="muted">域名和 minishort.sbs 在同一个 Cloudflare 账号（如 minishort.top）</p>
          <ol className="guide-steps">
            {sameAccountSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>方式 C：外部账号自有域名（CNAME 方案）</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          仅当域名在<strong>另一个</strong> Cloudflare 账号时使用 CNAME → <code>{ORIGIN_TARGET}</code>。同账号不要用此方式，否则会 522。
        </p>
        <ol className="guide-steps">
          {customSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>外部账号 DNS 配置（CNAME）</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          CNAME 目标必须为 <code>{ORIGIN_TARGET}</code>，且必须开启代理（橙云 ☁️）。不要用 *.workers.dev，否则会 522。
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
                <td>CNAME</td>
                <td><code>{row.name}</code></td>
                <td><code>{row.target}</code></td>
                <td>已代理 ☁️</td>
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
              <td><code>minishort.top</code></td>
            </tr>
            <tr>
              <td>下载链接</td>
              <td>该域名专属 APK 地址，每个域名可不同</td>
              <td><code>https://...</code></td>
            </tr>
            <tr>
              <td>Pixel ID</td>
              <td>Facebook Pixel，用于广告转化追踪</td>
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

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>常见问题</h2>
        <dl className="guide-faq">
          <dt>minishort.top 和 minishort.sbs 有什么区别？</dt>
          <dd>
            <code>*.minishort.sbs</code> 是平台子域，后台添加后自动绑定。
            <code>minishort.top</code> 与 minishort.sbs 在同一 Cloudflare 账号时，应直接绑定 Worker 自定义域，<strong>不要</strong> CNAME 到 origin。
          </dd>
          <dt>为什么 CNAME 到 origin 会 522？</dt>
          <dd>
            同账号域名 CNAME 到 origin.minishort.sbs 时，Cloudflare 不会把外部 Host 转给 Worker（需 SSL for SaaS 套餐）。
            正确做法：Workers → lp-admin-worker → 添加自定义域。
          </dd>
          <dt>修改一个域名的下载链接会影响其他域名吗？</dt>
          <dd>不会。每个域名有独立落地页配置，保存时只影响当前域名。</dd>
          <dt>和 Facebook「潜在客户」数字对不上？</dt>
          <dd>
            请看 Dashboard 表格里的「独立下载用户」，不要和「下载次数」对比。Facebook 只统计广告归因的 Lead，后台统计所有访问来源。
          </dd>
        </dl>
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
