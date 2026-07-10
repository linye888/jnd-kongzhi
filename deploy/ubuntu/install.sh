#!/usr/bin/env bash
set -euo pipefail

# LP Admin Ubuntu 一键部署脚本
# 用法: sudo bash deploy/ubuntu/install.sh --domain example.com --email admin@example.com

APP_DIR="/opt/lp-admin"
APP_USER="lpadmin"
DOMAIN=""
ADMIN_DOMAIN=""
ADMIN_EMAIL=""
JWT_SECRET=""
SKIP_BUILD=0

usage() {
  cat <<'EOF'
LP Admin Ubuntu 部署脚本

用法:
  sudo bash deploy/ubuntu/install.sh --domain example.com [选项]

必填:
  --domain DOMAIN          主域名（落地页/API），如 example.com

可选:
  --admin-domain DOMAIN    管理后台域名，默认 admin.example.com
  --email EMAIL            Let's Encrypt 证书邮箱
  --jwt-secret SECRET      JWT 密钥（默认自动生成）
  --skip-build             跳过 pnpm build（源码已构建时使用）
  -h, --help               显示帮助

示例:
  sudo bash deploy/ubuntu/install.sh --domain example.com --email you@example.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --admin-domain) ADMIN_DOMAIN="$2"; shift 2 ;;
    --email) ADMIN_EMAIL="$2"; shift 2 ;;
    --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  echo "错误: 必须指定 --domain"
  usage
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "错误: 请使用 sudo 运行"
  exit 1
fi

ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.${DOMAIN}}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> 安装系统依赖"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx build-essential python3 rsync

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]]; then
  echo "==> 安装 Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> 安装 pnpm"
  corepack enable
  corepack prepare pnpm@10.33.3 --activate
fi

echo "==> 创建应用用户与目录"
id -u "$APP_USER" &>/dev/null || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"/{data,legacy/assets,admin,logs}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> 同步项目文件"
rsync -a --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .wrangler \
  --exclude apps/server/data \
  --exclude apps/server/dist \
  "$REPO_DIR/" "$APP_DIR/src/"

echo "==> 写入环境配置"
cat > "$APP_DIR/src/apps/server/.env" <<EOF
JWT_SECRET=${JWT_SECRET}
HOST=127.0.0.1
PORT=3000
PLATFORM_ZONE=${DOMAIN}
CNAME_TARGET=customers.${DOMAIN}
FALLBACK_ORIGIN=origin.${DOMAIN}
DB_PATH=${APP_DIR}/data/lp-admin.db
ASSETS_DIR=${APP_DIR}/legacy/assets
ADMIN_DIR=${APP_DIR}/admin
ADMIN_DEFAULT_EMAIL=admin@${DOMAIN}
ADMIN_DEFAULT_PASSWORD=admin123456
EOF
chmod 600 "$APP_DIR/src/apps/server/.env"
chown "$APP_USER:$APP_USER" "$APP_DIR/src/apps/server/.env"

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "==> 安装依赖并构建"
  cd "$APP_DIR/src"
  sudo -u "$APP_USER" pnpm install --frozen-lockfile 2>/dev/null || sudo -u "$APP_USER" pnpm install
  sudo -u "$APP_USER" bash -c "cd apps/admin && VITE_API_BASE=https://${DOMAIN} pnpm build"
  rsync -a "$APP_DIR/src/apps/admin/dist/" "$APP_DIR/admin/"
fi

echo "==> 配置 systemd 服务"
sed "s|__APP_DIR__|${APP_DIR}|g" "$REPO_DIR/deploy/ubuntu/lp-admin.service" > /etc/systemd/system/lp-admin.service
systemctl daemon-reload
systemctl enable lp-admin
systemctl restart lp-admin

echo "==> 配置 Nginx"
sed -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__ADMIN_DOMAIN__|${ADMIN_DOMAIN}|g" \
    -e "s|__APP_DIR__|${APP_DIR}|g" \
    "$REPO_DIR/deploy/ubuntu/nginx.conf" > /etc/nginx/sites-available/lp-admin
ln -sf /etc/nginx/sites-available/lp-admin /etc/nginx/sites-enabled/lp-admin
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [[ -n "$ADMIN_EMAIL" ]]; then
  echo "==> 申请 SSL 证书"
  certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" -d "$ADMIN_DOMAIN" -d "customers.${DOMAIN}" -d "origin.${DOMAIN}" \
    --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect || true
fi

echo "==> 初始化数据库"
cd "$APP_DIR/src/apps/server"
sudo -u "$APP_USER" pnpm db:migrate
sudo -u "$APP_USER" pnpm db:seed || true

cat <<EOF

========================================
LP Admin 部署完成
========================================
API / 落地页:  https://${DOMAIN}
管理后台:      https://${ADMIN_DOMAIN}
健康检查:      https://${DOMAIN}/health

默认管理员:
  邮箱: admin@${DOMAIN}
  密码: admin123456  （请尽快修改）

JWT_SECRET 已写入 ${APP_DIR}/src/apps/server/.env

常用命令:
  systemctl status lp-admin
  journalctl -u lp-admin -f
  systemctl restart lp-admin

EOF
