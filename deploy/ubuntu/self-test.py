import json
import sys
import urllib.error
import urllib.request

BASE = "http://43.160.237.168"
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    line = f"[{mark}] {name}"
    if detail:
        line += f" - {detail}"
    print(line)


def get(path, timeout=15):
    req = urllib.request.Request(f"{BASE}{path}")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="replace")


def post(path, data, timeout=15):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode())


# 1. 健康检查
try:
    status, body = get("/health")
    check("健康检查 /health", status == 200 and '"ok":true' in body, body.strip())
except Exception as e:
    check("健康检查 /health", False, str(e))

# 2. 管理后台首页
try:
    status, body = get("/admin/")
    check("管理后台 /admin/", status == 200 and "<html" in body.lower(), f"HTTP {status}")
except Exception as e:
    check("管理后台 /admin/", False, str(e))

# 3. 管理后台静态资源
try:
    status, _ = get("/admin/index.html")
    check("后台 index.html", status == 200)
except Exception as e:
    check("后台 index.html", False, str(e))

# 4. 登录 API
token = None
try:
    status, payload = post("/api/auth/login", {"email": "admin@lp.local", "password": "admin123456"})
    token = payload.get("data", {}).get("token")
    check("登录 API", status == 200 and bool(token), "token 已获取" if token else "无 token")
except Exception as e:
    check("登录 API", False, str(e))

# 5. 鉴权 API - 域名列表
if token:
    try:
        req = urllib.request.Request(
            f"{BASE}/api/admin/domains",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())
            domains = body.get("data", [])
            check("域名列表 API", resp.status == 200 and isinstance(domains, list), f"共 {len(domains)} 条")
    except Exception as e:
        check("域名列表 API", False, str(e))
else:
    check("域名列表 API", False, "跳过：无 token")

# 6. 统计 API
if token:
    try:
        req = urllib.request.Request(
            f"{BASE}/api/admin/stats/overview?from=2026-01-01&to=2026-12-31",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())
            check("统计 API", resp.status == 200 and body.get("success") is True)
    except Exception as e:
        check("统计 API", False, str(e))
else:
    check("统计 API", False, "跳过：无 token")

# 7. 落地页（localhost 域名需 Host 头）
try:
    req = urllib.request.Request(f"{BASE}/", headers={"Host": "localhost"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        check("落地页渲染 (Host: localhost)", resp.status == 200 and "<html" in body.lower(), f"HTTP {resp.status}")
except Exception as e:
    check("落地页渲染 (Host: localhost)", False, str(e))

# 8. 未配置域名应 404
try:
    req = urllib.request.Request(f"{BASE}/", headers={"Host": "not-exist.example.com"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        check("未配置域名返回", False, f"意外 HTTP {resp.status}")
except urllib.error.HTTPError as e:
    check("未配置域名返回 404", e.code == 404, f"HTTP {e.code}")
except Exception as e:
    check("未配置域名返回 404", False, str(e))

failed = [name for name, ok, _ in results if not ok]
print("\n=== 汇总 ===")
print(f"通过: {sum(1 for _, ok, _ in results if ok)}/{len(results)}")
if failed:
    print("失败项:", ", ".join(failed))
    sys.exit(1)
print("全部通过")
