import os
import sys

import paramiko

HOST = os.environ.get("DEPLOY_HOST", sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1")
USER = os.environ.get("DEPLOY_USER", sys.argv[2] if len(sys.argv) > 2 else "ubuntu")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", sys.argv[3] if len(sys.argv) > 3 else "")

if not PASSWORD:
    raise SystemExit("请设置 DEPLOY_SSH_PASSWORD 环境变量，或传入第三个参数")


def connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30, banner_timeout=30)
    return ssh
