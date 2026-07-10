from ssh_common import connect

ssh = connect()
stdin, stdout, stderr = ssh.exec_command("tail -n 40 /opt/lp-admin/logs/server.error.log")
print(stdout.read().decode(errors="replace"))
ssh.close()
