import json
import urllib.request

BASE = "http://43.160.237.168"

# login
req = urllib.request.Request(
    f"{BASE}/api/auth/login",
    data=json.dumps({"email": "admin@lp.local", "password": "admin123456"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read())["data"]["token"]

req2 = urllib.request.Request(
    f"{BASE}/api/admin/domains/platform-config",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req2) as resp:
    print(json.dumps(json.loads(resp.read())["data"], indent=2, ensure_ascii=False))

# test setup guide via adding would need POST - instead call setup endpoint if exists
req3 = urllib.request.Request(
    f"{BASE}/api/admin/domains/1/setup",
    headers={"Authorization": f"Bearer {token}"},
)
try:
    with urllib.request.urlopen(req3) as resp:
        guide = json.loads(resp.read())["data"]
        print("\n--- setup guide ---")
        print("deployTarget:", guide.get("deployTarget"))
        print("note:", guide.get("note"))
        print("steps[1]:", guide["steps"][1] if len(guide["steps"]) > 1 else "")
except Exception as e:
    print("setup check:", e)
