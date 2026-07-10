"""重新构建管理后台（修复 /admin/ 静态资源路径）"""
import sys

from ssh_common import connect

HOST_IP = "43.160.237.168"

REMOTE_SCRIPT = f"""set -euo pipefail
cd /opt/lp-admin/src
sudo git fetch origin main && sudo git reset --hard origin/main
cd apps/admin
sudo -u lpadmin bash -lc 'VITE_BASE_PATH=/admin/ VITE_API_BASE=http://{HOST_IP} /usr/bin/pnpm build'
sudo rsync -a /opt/lp-admin/src/apps/admin/dist/ /opt/lp-admin/admin/
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
