# minishort.sbs DNS 配置（更新版）

## ✅ 已正确：admin.minishort.sbs

```
admin  CNAME  lp-admin-6rt.pages.dev  （已代理 ☁️）
```

管理后台：https://admin.minishort.sbs

---

## ⚠️ 需修改：minishort.sbs 和 origin.minishort.sbs

**不要** CNAME 到 `*.workers.dev`，会导致 **522 错误**。

### 正确做法（二选一）

### 方法 A：在 Cloudflare 控制台绑定 Worker 域名（推荐，无需 API Token 权限）

1. 打开 **Workers 和 Pages** → **lp-admin-worker**
2. **设置** → **域和路由** → **添加** → **自定义域**
3. 分别添加：
   - `minishort.sbs`
   - `origin.minishort.sbs`
4. 回到 **DNS**，**删除** 这两条错误记录：
   - `minishort.sbs` → `lp-admin-worker.ceddnabby.workers.dev`
   - `origin` → `lp-admin-worker.ceddnabby.workers.dev`
5. 添加自定义域后，Cloudflare 会自动创建正确的 DNS 记录

### 方法 B：手动 DNS + Worker 路由

若 Worker 路由已部署，DNS 改为：

| 类型 | 名称 | 内容 | 代理 |
|------|------|------|------|
| A | `@` | `192.0.2.1` | 已代理 ☁️ |
| A | `origin` | `192.0.2.1` | 已代理 ☁️ |

（`192.0.2.1` 是占位 IP，流量由 Worker 路由接管）

---

## 关于 API Token 权限（找不到时）

**不需要找权限也能完成大部分操作**，直接在 Cloudflare **网页控制台**操作即可：

| 要做的事 | 控制台位置（无需 Token） |
|----------|-------------------------|
| 改 DNS | 网站 → minishort.sbs → **DNS** |
| 绑 Worker 域名 | Workers → lp-admin-worker → **域和路由** |
| 绑 Pages 域名 | Workers → Pages → lp-admin → **自定义域** |
| for SaaS | 网站 → minishort.sbs → **SSL/TLS** → **Custom Hostnames** |

API Token 权限只有在你希望**程序自动**添加域名/SSL 时才需要。手动在控制台操作**不用**配那些权限。

### 若仍想给 Token 加权限

1. https://dash.cloudflare.com/profile/api-tokens
2. 找到当前 Token → **编辑**
3. **清空搜索框**（不要搜 `sa`）
4. 搜 **`DNS`** → 勾选 **DNS Edit**
5. 搜 **`SSL`** → 勾选 **SSL and Certificates Edit**
6. 资源选 **Zone** → **minishort.sbs**

---

## 当前状态

| 域名 | 状态 |
|------|------|
| admin.minishort.sbs | ✅ 正常 |
| minishort.sbs | ❌ 522（需按上面修改） |
| origin.minishort.sbs | ❌ 522（需按上面修改） |
