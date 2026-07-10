# Ubuntu 自托管部署指南

本文档介绍如何在 **Ubuntu 22.04/24.04** 服务器上部署 LP Admin，无需 Cloudflare Workers。

## 架构对比

| 组件 | Cloudflare 版 | Ubuntu 自托管版 |
|------|--------------|----------------|
| API / 落地页 | Cloudflare Worker | Node.js (`apps/server`) |
| 数据库 | Cloudflare D1 | SQLite (`better-sqlite3`) |
| 缓存 | Cloudflare KV | 内存 KV |
| 管理后台 | Cloudflare Pages | Nginx 静态托管 |
| 定时任务 | Worker Cron | `node-cron` |
| SSL | Cloudflare 自动 | Certbot + Nginx |

## 系统要求

- Ubuntu 22.04 或 24.04 LTS
- 2 GB+ 内存
- Node.js >= 20
- 域名已解析到服务器 IP

## 一键部署

在服务器上克隆仓库后执行：

```bash
git clone https://github.com/linye888/lp-admin.git
cd lp-admin
sudo bash deploy/ubuntu/install.sh \
  --domain yourdomain.com \
  --email you@example.com
```

脚本会自动完成：

1. 安装 Node.js 20、pnpm、Nginx、Certbot
2. 构建管理后台与 API 服务
3. 配置 systemd 守护进程
4. 配置 Nginx 反向代理
5. 申请 Let's Encrypt SSL 证书
6. 初始化数据库并 seed 演示数据

## 手动部署（开发/调试）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp apps/server/.env.example apps/server/.env
# 编辑 JWT_SECRET 和 PLATFORM_ZONE
```

### 3. 构建

```bash
# 构建管理后台（API 地址指向你的域名）
cd apps/admin
VITE_API_BASE=http://localhost:3000 pnpm build

# 将构建产物复制到 server 可读取的目录
mkdir -p ../server/admin
cp -r dist/* ../server/admin/

# 构建 API 服务（tsx 直接运行，无需编译）
cd ../server
pnpm typecheck
```

### 4. 初始化数据库

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. 启动服务

```bash
pnpm start
# 或开发模式
pnpm dev
```

访问：
- 管理后台：http://localhost:3000/admin/
- 健康检查：http://localhost:3000/health
- API：http://localhost:3000/api/

## 域名配置

### 平台子域名（推荐）

在 DNS 添加 A 记录指向服务器 IP：

| 记录 | 类型 | 值 |
|------|------|-----|
| `@` | A | 服务器 IP |
| `www` | A | 服务器 IP |
| `admin` | A | 服务器 IP |
| `customers` | A | 服务器 IP |
| `origin` | A | 服务器 IP |

在后台添加 `sub.yourdomain.com` 等平台子域名时，系统识别为平台域名，SSL 由 Nginx + Certbot 统一签发。

### 客户自有域名

客户将域名 CNAME 到 `origin.yourdomain.com`（或 A 记录指向你的服务器 IP），然后在后台添加该域名并绑定落地页。证书可通过客户侧 CDN 或你方 Nginx 的 SNI 配置处理。

## 运维命令

```bash
# 查看服务状态
sudo systemctl status lp-admin

# 查看日志
sudo journalctl -u lp-admin -f
tail -f /opt/lp-admin/logs/server.log

# 重启服务
sudo systemctl restart lp-admin

# 更新部署
cd /opt/lp-admin/src
git pull
sudo -u lpadmin pnpm install
sudo -u lpadmin bash -c "cd apps/admin && VITE_API_BASE=https://yourdomain.com pnpm build"
rsync -a apps/admin/dist/ /opt/lp-admin/admin/
sudo -u lpadmin bash -c "cd apps/server && pnpm install"
sudo systemctl restart lp-admin
```

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `PLATFORM_ZONE` | 是 | 主域名，如 `example.com` |
| `PORT` | 否 | 监听端口，默认 3000 |
| `DB_PATH` | 否 | SQLite 数据库路径 |
| `ADMIN_DIR` | 否 | 管理后台静态文件目录 |
| `ASSETS_DIR` | 否 | 落地页静态资源目录 |

完整列表见 `apps/server/.env.example`。

## 与 Cloudflare 版的差异

- **无边缘计算**：所有请求由单台 Ubuntu 服务器处理，高流量时需加负载均衡
- **无 Cloudflare for SaaS**：客户域名 SSL 需自行用 Certbot 或客户 CDN 处理
- **KV 缓存为内存级**：重启后域名缓存会清空（会自动从数据库重建）
- **R2 存储未启用**：素材上传功能如依赖 R2 需另行扩展本地存储

## 目录结构（生产环境）

```
/opt/lp-admin/
├── src/              # 项目源码
├── data/             # SQLite 数据库
├── admin/            # 管理后台静态文件
├── legacy/assets/    # 落地页静态资源
└── logs/             # 服务日志
```
