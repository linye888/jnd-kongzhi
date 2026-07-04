# 方案 A 实施说明（Free + 客户自有 Cloudflare）

## 架构

```
Facebook 广告用户
       │
       ▼
客户域名 client.com（客户 Cloudflare，Free）
       │  CNAME 橙云 → origin.minishort.sbs
       ▼
LP Admin Worker（minishort.sbs Zone）
       │  按 Host 匹配落地页
       ▼
落地页 HTML + Pixel + 统计
```

## 两种域名模式

| 模式 | 示例 | DNS 谁配 | 证书 |
|------|------|----------|------|
| **平台子域（推荐）** | `india.minishort.sbs` | 平台自动 | 自动 |
| **客户自有域** | `client.com` | 客户 CF | 客户 CF 自动 |

## 管理员日常流程

### 新建子域名落地页

1. LP Admin → 域名管理 → 添加 `xxx.minishort.sbs`
2. 选择客户 / 产品 / 落地页
3. 平台自动绑定 Worker，1～5 分钟后可访问
4. 将 `https://xxx.minishort.sbs` 用于广告投放

### 新建客户自有域名

1. 发送 [CUSTOMER-DNS.md](./CUSTOMER-DNS.md) 给客户
2. 客户完成 Cloudflare CNAME 配置
3. LP Admin → 添加 `client.com` 并绑定落地页
4. 测试访问与统计数据

## 不需要

- ❌ Business $200 套餐
- ❌ Cloudflare for SaaS / Custom Hostnames
- ❌ 本机部署 Admin

## 仍需完成（人工）

- [ ] 修改默认管理员密码
- [ ] 轮换 API Token + GitHub Secrets
- [ ] 删除测试域名（localhost、workers.dev 等）

## 后续开发（阶段 2+）

见主 README 与历史计划：素材上传、CSV 导出、角色权限等。
