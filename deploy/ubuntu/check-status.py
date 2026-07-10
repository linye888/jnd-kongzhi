from ssh_common import connect

ssh = connect()
cmds = [
    "systemctl is-active lp-admin 2>/dev/null || echo inactive",
    "curl -s -m 3 http://127.0.0.1/health || echo health_fail",
    "curl -s -m 3 http://127.0.0.1:3000/health || echo health_fail",
    "test -f /opt/lp-admin/data/lp-admin.db && echo db_ok || echo db_missing",
    "test -f /opt/lp-admin/admin/index.html && echo admin_ok || echo admin_missing",
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(">>>", cmd)
    print(stdout.read().decode().strip())
ssh.close()
