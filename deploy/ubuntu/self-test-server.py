from ssh_common import connect

checks = [
    ("systemctl is-active lp-admin", "active"),
    ("curl -sf http://127.0.0.1:3000/health", "ok"),
    ("curl -sf http://127.0.0.1/health", "ok"),
    ("test -f /opt/lp-admin/data/lp-admin.db && echo db_ok", "db_ok"),
    ("test -f /opt/lp-admin/admin/index.html && echo admin_ok", "admin_ok"),
]

ssh = connect()
print("=== 服务器内部检查 ===")
for cmd, expect in checks:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    ok = expect in out
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {cmd} -> {out[:120]}")
ssh.close()
