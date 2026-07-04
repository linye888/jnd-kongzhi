# 客户域名配置指南（方案 A）

适用于：客户使用 **自己的 Cloudflare 账号**（Free 即可），绑定 Mini Short 落地页。

## 你需要提供给客户的信息

| 项目 | 值 |
|------|-----|
| CNAME 目标 | `origin.minishort.sbs` |
| 代理状态 | 必须开启（橙云 ☁️） |
| 落地页链接 | `https://客户域名`（在 LP Admin 配置后生效） |

## 客户操作步骤（可复制发给客户）

### 1. 将域名接入 Cloudflare

1. 登录 https://dash.cloudflare.com
2. 添加站点 → 输入客户域名（如 `client.com`）
3. 按提示将域名的 NS 服务器改为 Cloudflare 提供的地址
4. 等待状态变为「有效」

### 2. 添加 DNS 记录

在 Cloudflare DNS 页面添加：

| 类型 | 名称 | 目标 | 代理 |
|------|------|------|------|
| CNAME | `@` | `origin.minishort.sbs` | 已代理 ☁️ |
| CNAME | `www` | `origin.minishort.sbs` | 已代理 ☁️ |

> 若 `@` 已有其他记录，可只用 `www` 或咨询管理员。

### 3. 等待 SSL 证书

- 进入 **SSL/TLS** → 概览
- 模式建议：**灵活** 或 **完全**
- 等待证书状态变为有效（通常 5～15 分钟）

### 4. 通知管理员

告知管理员你的域名已配置完成，管理员会在 LP Admin 后台添加：

- 域名：`client.com`
- 对应落地页模板

### 5. 测试

访问 `https://client.com`，应看到 Mini Short 落地页。

---

## 更简单的替代方案：子域名

若客户不想操作 Cloudflare，可直接使用平台提供的子域名：

```
https://客户名.minishort.sbs
```

由平台自动配置，**无需客户任何 DNS 操作**。

---

## 常见问题

**Q：证书会自动生成吗？**  
A：会。在客户自己的 Cloudflare 账号里自动生成，无需额外付费。

**Q：需要把域名转给我们吗？**  
A：不需要。域名仍在客户账号，只 CNAME 指向我们。

**Q：Facebook 广告填什么链接？**  
A：`https://客户域名` 或 `https://xxx.minishort.sbs`
