import os
import sys

from ssh_common import HOST, PASSWORD, USER, connect

REMOTE_SCRIPT = """set -euo pipefail
PNPM=/usr/bin/pnpm
HOST_IP=""" + f'"{HOST}"' + """

echo '==> 继续构建与启动'
cd /opt/lp-admin/src
sudo -u lpadmin $PNPM install
BS3_DIR=$(ls -d /opt/lp-admin/src/node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 2>/dev/null | head -1 || true)
if [ -n "$BS3_DIR" ]; then
  echo "==> 编译 better-sqlite3"
  cd "$BS3_DIR"
  sudo -u lpadmin npm run build-release
  cd /opt/lp-admin/src
fi
sudo -u lpadmin $PNPM --filter @lp-admin/shared build
sudo -u lpadmin $PNPM --filter @lp-admin/db build
sudo -u lpadmin $PNPM --filter @lp-admin/templates build
sudo -u lpadmin bash -lc "cd /opt/lp-admin/src/apps/admin && VITE_BASE_PATH=/admin/ VITE_API_BASE=http://$HOST_IP $PNPM build"
sudo rsync -a /opt/lp-admin/src/apps/admin/dist/ /opt/lp-admin/admin/
cd /opt/lp-admin/src/apps/server
sudo -u lpadmin $PNPM db:migrate
sudo -u lpadmin $PNPM db:seed || true
sudo systemctl restart lp-admin
sleep 3
curl -sf http://127.0.0.1/health && echo
sudo systemctl is-active lp-admin
echo DEPLOY_OK
"""

if __name__ == "__main__":
    ssh = connect()
    stdin, stdout, stderr = ssh.exec_command("bash -s", timeout=900)
    stdin.write(REMOTE_SCRIPT)
    stdin.channel.shutdown_write()
    exit_status = stdout.channel.recv_exit_status()
    sys.stdout.buffer.write(stdout.read())
    sys.stdout.buffer.write(stderr.read())
    ssh.close()
    raise SystemExit(exit_status)
