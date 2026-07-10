"""重新构建 Ubuntu 独立版（不连接 Cloudflare）"""
import sys

from ssh_common import connect

HOST_IP = "43.160.237.168"

REMOTE_SCRIPT = f"""set -euo pipefail
PNPM=/usr/bin/pnpm
cd /opt/lp-admin/src
sudo git fetch origin main && sudo git reset --hard origin/main

# 写入 Ubuntu 独立版环境（无 Cloudflare 配置）
sudo tee /opt/lp-admin/src/apps/server/.env >/dev/null <<EOF
JWT_SECRET=$(sudo grep '^JWT_SECRET=' /opt/lp-admin/src/apps/server/.env 2>/dev/null | cut -d= -f2- || openssl rand -hex 32)
HOST=127.0.0.1
PORT=3000
DEPLOY_TARGET=self-hosted
SERVER_IP={HOST_IP}
PLATFORM_ZONE={HOST_IP}
DB_PATH=/opt/lp-admin/data/lp-admin.db
ASSETS_DIR=/opt/lp-admin/legacy/assets
ADMIN_DIR=/opt/lp-admin/admin
ADMIN_DEFAULT_EMAIL=admin@lp.local
ADMIN_DEFAULT_PASSWORD=admin123456
EOF
sudo chmod 600 /opt/lp-admin/src/apps/server/.env
sudo chown lpadmin:lpadmin /opt/lp-admin/src/apps/server/.env

sudo -u lpadmin $PNPM --filter @lp-admin/shared build
cd apps/admin
sudo -u lpadmin bash -lc 'VITE_API_BASE=http://{HOST_IP} $PNPM build:ubuntu'
sudo rsync -a /opt/lp-admin/src/apps/admin/dist/ /opt/lp-admin/admin/
sudo systemctl restart lp-admin
grep -E 'src=|href=' /opt/lp-admin/admin/index.html
echo REBUILD_OK
"""

if __name__ == "__main__":
    ssh = connect()
    stdin, stdout, stderr = ssh.exec_command("bash -s", timeout=300)
    stdin.write(REMOTE_SCRIPT)
    stdin.channel.shutdown_write()
    code = stdout.channel.recv_exit_status()
    sys.stdout.buffer.write(stdout.read())
    sys.stdout.buffer.write(stderr.read())
    ssh.close()
    raise SystemExit(code)
