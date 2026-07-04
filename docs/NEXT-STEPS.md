# 下一步：Cloudflare for SaaS 开通清单

登录已恢复。要支持 **50+ 客户独立域名 + 自动 HTTPS**，按顺序完成：

## 1. 升级 / 开通 for SaaS

- Cloudflare 控制台 → `minishort.sbs`
- 确认套餐支持 **SSL for SaaS**（通常 Business 或联系销售）
- 若 Custom Hostnames API 返回 **1404**，说明配额未开通

## 2. 配置 Fallback Origin

- **SSL/TLS** → **Custom Hostnames**
- Fallback Origin 设为：`origin.minishort.sbs`
- 确认 `origin.minishort.sbs` 已绑定 Worker 且能打开落地页

## 3. 添加 customers CNAME 目标

在 `minishort.sbs` DNS 添加：

```
customers  CNAME  <Cloudflare for SaaS 提供的目标>  （已代理 ☁️）
```

客户域名 CNAME 到：`customers.minishort.sbs`

## 4. 后台添加客户域名

- LP Admin → 域名管理 → 添加域名
- 若 for SaaS 已开通，会自动创建 Custom Hostname
- 若未开通，后台会显示明确警告（错误 1404）

## 5. GitHub Actions 部署 Worker（可选）

在 GitHub 仓库 **Settings → Secrets** 添加：

| Secret | 值 |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | 你的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | `6264257c07a1f8fcd60375f5d5434fc1` |

Push 到 `main` 后，Worker 变更会自动部署（Pages Admin 仍由 Cloudflare Git 集成部署）。

## 6. 安全

- [ ] 修改默认管理员密码
- [ ] 轮换已在聊天中暴露的 API Token
