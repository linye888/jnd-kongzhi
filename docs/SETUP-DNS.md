# minishort.sbs DNS 配置清单

> Token 当前缺少 **Zone DNS Edit** 权限，需你在 Cloudflare 控制台手动添加以下记录。

## 1. 管理后台（Pages）

| 类型 | 名称 | 目标 | 代理 |
|------|------|------|------|
| CNAME | `admin` | `lp-admin-6rt.pages.dev` | 已代理 ☁️ |

已在 Pages 项目 `lp-admin` 添加自定义域 `admin.minishort.sbs`，状态：**pending**（DNS 生效后自动签发 SSL）

访问：https://admin.minishort.sbs

## 2. Worker / Fallback Origin

| 类型 | 名称 | 目标 | 代理 |
|------|------|------|------|
| CNAME | `origin` | `lp-admin-worker.ceddnabby.workers.dev` | 已代理 ☁️ |
| CNAME | `@` 或 `www` | `lp-admin-worker.ceddnabby.workers.dev` | 已代理 ☁️（可选，主站落地页） |

## 3. Cloudflare for SaaS（客户域名 CNAME 目标）

| 类型 | 名称 | 目标 | 说明 |
|------|------|------|------|
| CNAME | `customers` | 见 SaaS 控制台 | for SaaS 开通后在 SSL/TLS → Custom Hostnames 查看 |

## 4. API Token 还需补充

Zone: **minishort.sbs**

- DNS → Edit
- SSL and Certificates → Edit
- Workers Routes → Edit（可选）

## 5. Fallback Origin 设置

Cloudflare → minishort.sbs → SSL/TLS → Custom Hostnames → Fallback Origin = `origin.minishort.sbs`

---

配置完成后：
- 管理后台：https://admin.minishort.sbs
- 落地页：https://minishort.sbs 或 https://origin.minishort.sbs
- Worker API：https://lp-admin-worker.ceddnabby.workers.dev
