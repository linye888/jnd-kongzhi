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

## 生产环境（已部署）

| 项目 | 地址 |
|------|------|
| Worker API | https://lp-admin-worker.ceddnabby.workers.dev |
| 健康检查 | https://lp-admin-worker.ceddnabby.workers.dev/health |
| Fallback Origin（计划） | `origin.minishort.sbs` |
| 客户 CNAME 目标 | `customers.minishort.sbs` |
| Cloudflare Zone | `minishort.sbs` |

默认管理员：`admin@example.com` / `admin123456`（**请尽快修改**）

### Admin 前端连接生产 API

```bash
cd apps/admin
VITE_API_BASE=https://lp-admin-worker.ceddnabby.workers.dev pnpm build
# 将 dist/ 部署到 Cloudflare Pages 或任意静态托管
```

本地开发 Admin 连生产：

```bash
VITE_API_BASE=https://lp-admin-worker.ceddnabby.workers.dev pnpm dev:admin
```

## Cloudflare for SaaS 开通指南（minishort.sbs）

当前 Token **缺少 Zone 级 SSL 权限**，Custom Hostnames 暂不可用。按以下步骤开通：

### 1. 升级套餐（如需要）
- 登录 Cloudflare → 选择 `minishort.sbs`
- for SaaS 通常需要 **Business** 或联系 Cloudflare 开通 SaaS

### 2. 补 API Token 权限
- **SSL and Certificates → Edit**（Zone: minishort.sbs）
- **Workers Routes → Edit**（可选，用于绑定自定义域路由）

### 3. 配置 Fallback Origin
- Cloudflare Dashboard → `minishort.sbs` → **SSL/TLS** → **Custom Hostnames**
- 设置 Fallback Origin 为：`origin.minishort.sbs`
- 在 DNS 添加 `origin` CNAME 指向 `lp-admin-worker.ceddnabby.workers.dev`（或 Worker 自定义域）

### 4. 客户域名 CNAME
- 客户域名 CNAME 到：`customers.minishort.sbs`
- 在 DNS 添加 `customers` 记录指向 Cloudflare for SaaS 提供的目标

### 5. 后台添加域名
- 在 LP Admin → 域名管理 → 添加客户域名
- 系统自动调用 Custom Hostnames API 签发 SSL


## 数据统计口径

| 指标 | 说明 |
|------|------|
| 访问次数 (PV) | 页面加载次数 |
| 访问用户 (UV) | visitor_id 去重 |
| 下载次数 | 下载 CTA 点击总次数 |
| 独立下载用户 | 下载事件 visitor_id 去重 |

## 仓库

https://github.com/linye888/lp-admin
