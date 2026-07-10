import sys

from ssh_common import connect

ssh = connect()
cmds = [
    "sudo git config --global --add safe.directory /opt/lp-admin/src",
    "cd /opt/lp-admin/src && sudo git pull origin main",
    "sudo systemctl restart lp-admin",
    "sleep 2 && systemctl is-active lp-admin",
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(">>>", cmd)
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
ssh.close()
