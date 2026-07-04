# LP Admin — 落地页管理平台

多域名落地页 SaaS 管理平台，支持 **50+ 独立域名**、Cloudflare for SaaS、Worker 边缘路由、后台批量管理、数据统计。

## 架构

```
apps/admin     → React 管理后台 (Vite)
apps/worker    → Cloudflare Worker (Hono + D1 + KV + R2)
packages/db    → Drizzle ORM + D1 migrations
packages/templates → 落地页 HTML 模板渲染
packages/shared    → 共享 TypeScript 类型
legacy/        → 原始静态落地页参考 (jnd-kongzhi)
```

## 功能

- 客户 / 产品 / 落地页 / 域名 CRUD
- 域名 CSV 批量导入
- Cloudflare Custom Hostname API 集成（需配置 CF 凭证）
- Worker 按 Host 动态渲染落地页
- Facebook Pixel + iframe 下载（沿用原模板逻辑）
- 数据统计：访问次数、访问用户、下载次数、独立下载用户
- 多域名汇总（UV/独立下载用户 合计 + 跨域去重）
- 用户登录（多角色 UI，全员全权限）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 Worker（API + 落地页渲染）

```bash
pnpm dev:worker
```

首次运行需迁移数据库并 seed：

```bash
pnpm db:migrate:local
curl http://127.0.0.1:8787/ -H "Host: localhost"   # 触发 worker
pnpm db:seed:local
```

默认管理员：
- 邮箱：`admin@example.com`
- 密码：`admin123456`

本地测试域名（seed 后）：
- `localhost` → 印度英语版
- `demo-mx.local` → 墨西哥西语版

### 3. 启动管理后台

```bash
pnpm dev:admin
```

访问 http://localhost:5173

## 环境变量

复制 `.env.example` 为 `apps/worker/.dev.vars`：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥 |
| `CF_ACCOUNT_ID` | Cloudflare 账号 ID |
| `CF_API_TOKEN` | Cloudflare API Token |
| `CF_ZONE_ID` | SaaS Zone ID |
| `CNAME_TARGET` | 客户域名 CNAME 目标 |

## 部署

### Worker

```bash
cd apps/worker
wrangler d1 migrations apply lp-admin-db --remote
wrangler deploy
wrangler secret put JWT_SECRET
```

### Admin

```bash
cd apps/admin
pnpm build
# 部署 dist/ 到 Cloudflare Pages，设置 VITE_API_BASE 指向 Worker URL
```

## Cloudflare for SaaS

1. 配置 Fallback Origin 指向 Worker
2. 设置 `CF_*` 环境变量
3. 后台添加域名时自动调用 Custom Hostnames API
4. 客户将域名 CNAME 到 `CNAME_TARGET`

## 数据统计口径

| 指标 | 说明 |
|------|------|
| 访问次数 (PV) | 页面加载次数 |
| 访问用户 (UV) | visitor_id 去重 |
| 下载次数 | 下载 CTA 点击总次数 |
| 独立下载用户 | 下载事件 visitor_id 去重 |

## 仓库

https://github.com/linye888/lp-admin
