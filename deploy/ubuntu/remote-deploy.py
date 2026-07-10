#!/usr/bin/env python3
"""本地执行的一次性远程部署脚本。用法: python remote-deploy.py <ip> <user> <password>"""
import secrets
import sys

import paramiko

HOST = sys.argv[1]
USER = sys.argv[2]
PASSWORD = sys.argv[3]
JWT = secrets.token_hex(32)

REMOTE_SCRIPT = f"""set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo '==> 安装系统依赖'
sudo apt-get update -qq
sudo apt-get install -y -qq curl git nginx build-essential python3 rsync openssl

NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo 0)
if ! command -v node >/dev/null || [ "$NODE_MAJOR" -lt 20 ]; then
  echo '==> 安装 Node.js 20'
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

sudo corepack enable || true
sudo corepack prepare pnpm@10.33.3 --activate || sudo npm install -g pnpm@10.33.3
PNPM=/usr/bin/pnpm

echo '==> 创建目录与用户'
sudo id -u lpadmin >/dev/null 2>&1 || sudo useradd --system --home /opt/lp-admin --shell /usr/sbin/nologin lpadmin
sudo mkdir -p /opt/lp-admin/data /opt/lp-admin/legacy/assets /opt/lp-admin/admin /opt/lp-admin/logs /opt/lp-admin/src

if [ ! -d /opt/lp-admin/src/.git ]; then
  echo '==> 克隆仓库'
  sudo git clone https://github.com/linye888/jnd-kongzhi.git /opt/lp-admin/src
else
  echo '==> 更新仓库'
  sudo git config --global --add safe.directory /opt/lp-admin/src
  cd /opt/lp-admin/src && sudo git pull
fi
sudo chown -R lpadmin:lpadmin /opt/lp-admin

echo '==> 写入环境变量'
cat <<EOF | sudo tee /opt/lp-admin/src/apps/server/.env >/dev/null
JWT_SECRET={JWT}
HOST=127.0.0.1
PORT=3000
PLATFORM_ZONE={HOST}
CNAME_TARGET=customers.{HOST}
FALLBACK_ORIGIN=origin.{HOST}
DB_PATH=/opt/lp-admin/data/lp-admin.db
ASSETS_DIR=/opt/lp-admin/legacy/assets
ADMIN_DIR=/opt/lp-admin/admin
ADMIN_DEFAULT_EMAIL=admin@lp.local
ADMIN_DEFAULT_PASSWORD=admin123456
EOF
sudo chmod 600 /opt/lp-admin/src/apps/server/.env
sudo chown lpadmin:lpadmin /opt/lp-admin/src/apps/server/.env

echo '==> 安装依赖并构建'
cd /opt/lp-admin/src
sudo -u lpadmin $PNPM install
sudo -u lpadmin bash -lc "cd /opt/lp-admin/src/apps/admin && VITE_BASE_PATH=/admin/ VITE_API_BASE=http://{HOST} /usr/bin/pnpm build"
sudo rsync -a /opt/lp-admin/src/apps/admin/dist/ /opt/lp-admin/admin/

echo '==> 初始化数据库'
cd /opt/lp-admin/src/apps/server
sudo -u lpadmin $PNPM db:migrate
sudo -u lpadmin $PNPM db:seed || true

echo '==> 配置 systemd'
cat <<'UNIT' | sudo tee /etc/systemd/system/lp-admin.service >/dev/null
[Unit]
Description=LP Admin Server
After=network.target

[Service]
Type=simple
User=lpadmin
Group=lpadmin
WorkingDirectory=/opt/lp-admin/src/apps/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=5
StandardOutput=append:/opt/lp-admin/logs/server.log
StandardError=append:/opt/lp-admin/logs/server.error.log

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable lp-admin
sudo systemctl restart lp-admin

echo '==> 配置 Nginx'
cat <<'NGINX' | sudo tee /etc/nginx/sites-available/lp-admin >/dev/null
server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 20m;

    location /admin/ {{
        alias /opt/lp-admin/admin/;
        try_files $uri $uri/ /admin/index.html;
    }}

    location = /admin {{
        return 301 /admin/;
    }}

    location / {{
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
NGINX

sudo ln -sf /etc/nginx/sites-available/lp-admin /etc/nginx/sites-enabled/lp-admin
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

sleep 3
curl -sf http://127.0.0.1/health && echo
sudo systemctl is-active lp-admin
echo DEPLOY_OK
"""


def main() -> int:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST} ...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30, banner_timeout=30)
    stdin, stdout, stderr = ssh.exec_command("bash -s", timeout=900)
    stdin.write(REMOTE_SCRIPT)
    stdin.channel.shutdown_write()
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")
    if err.strip():
        print(err, file=sys.stderr)
    if exit_status != 0:
        print(f"Remote script failed with exit code {exit_status}", file=sys.stderr)
        return exit_status

    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
