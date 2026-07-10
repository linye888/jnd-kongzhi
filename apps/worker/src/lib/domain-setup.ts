import type { Env } from "../env";
import { createProxiedSubdomainRecord, isReservedPlatformHostname } from "./cf";
import { getDeployTarget, getPlatformConfig, getServerIp, isIpAddress } from "./platform-config";

export type DomainKind = "platform_subdomain" | "customer_owned";

export interface DomainSetupGuide {
  kind: DomainKind;
  hostname: string;
  cnameTarget: string;
  originTarget: string;
  steps: string[];
  note?: string;
  deployTarget?: "cloudflare" | "self-hosted";
}

const DEFAULT_PLATFORM_ZONE = "example.com";

export function getPlatformZone(env?: Env): string {
  return env?.PLATFORM_ZONE ?? DEFAULT_PLATFORM_ZONE;
}

export function getDomainKind(hostname: string, env?: Env): DomainKind {
  const platformZone = getPlatformZone(env);
  if (isIpAddress(platformZone)) return "customer_owned";
  const host = hostname.toLowerCase();
  if (host === platformZone || host.endsWith(`.${platformZone}`)) return "platform_subdomain";
  return "customer_owned";
}

function buildCloudflareGuide(env: Env, hostname: string, kind: DomainKind): DomainSetupGuide {
  const originTarget = env.FALLBACK_ORIGIN ?? `origin.${getPlatformZone(env)}`;
  const cnameTarget = env.CNAME_TARGET ?? `customers.${getPlatformZone(env)}`;

  if (kind === "platform_subdomain") {
    return {
      kind,
      hostname,
      cnameTarget,
      originTarget,
      deployTarget: "cloudflare",
      steps: [
        "在 LP Admin 添加该域名并绑定落地页（已完成或待完成）",
        "平台会自动将子域名绑定到 Worker（无需手动 DNS）",
        "等待 1～5 分钟后访问 https://" + hostname,
        "在 Facebook 广告中使用该链接投放",
      ],
      note: "推荐方式：零配置，证书由 Cloudflare 自动签发。",
    };
  }

  return {
    kind,
    hostname,
    cnameTarget,
    originTarget,
    deployTarget: "cloudflare",
    steps: [
      "客户将域名接入自己的 Cloudflare 账号（Free 套餐即可）",
      `添加 DNS：CNAME @ 或 www → ${originTarget}，开启代理（橙云 ☁️）`,
      "等待 SSL 状态变为「有效」（通常 5～15 分钟）",
      `在 LP Admin 添加域名：${hostname}，并绑定对应落地页`,
      "用 https://" + hostname + " 访问测试，确认落地页与 Pixel 正常",
      "通过后用于 Facebook 广告投放",
    ],
    note: "证书在客户 Cloudflare 侧自动生成；你方无需 Business for SaaS 套餐。",
  };
}

function buildSelfHostedGuide(env: Env, hostname: string, kind: DomainKind): DomainSetupGuide {
  const serverIp = getServerIp(env) ?? "你的服务器 IP";
  const platformZone = getPlatformZone(env);
  const useHttpOnly = isIpAddress(platformZone) || isIpAddress(hostname);
  const accessUrl = useHttpOnly ? `http://${hostname}` : `https://${hostname}`;
  const sslStep = useHttpOnly
    ? `当前为 IP/HTTP 模式，可直接访问 ${accessUrl} 测试；绑定域名后执行 certbot 开启 HTTPS`
    : `配置 HTTPS：sudo certbot --nginx -d ${hostname}`;

  if (kind === "platform_subdomain") {
    return {
      kind,
      hostname,
      cnameTarget: serverIp,
      originTarget: serverIp,
      deployTarget: "self-hosted",
      steps: [
        "在 LP Admin 添加该域名并绑定落地页",
        `在 DNS 添加 A 记录：${hostname} → ${serverIp}`,
        "等待 DNS 生效（通常 5～30 分钟，可用 ping / nslookup 检查）",
        sslStep,
        `访问 ${accessUrl} 测试落地页、下载按钮与 Pixel`,
        `Facebook 广告落地页填：${accessUrl}`,
      ],
      note: "Ubuntu 自托管：子域名需 A 记录解析到本服务器，Nginx 按 Host 自动路由。",
    };
  }

  return {
    kind,
    hostname,
    cnameTarget: serverIp,
    originTarget: serverIp,
    deployTarget: "self-hosted",
    steps: [
      "在 LP Admin 添加该域名并绑定落地页",
      `在域名 DNS 添加 A 记录：@ → ${serverIp}（根域名访问）`,
      `如有 www，添加 A 记录：www → ${serverIp}`,
      "等待 DNS 生效后访问落地页测试",
      sslStep,
      `Facebook 广告落地页填：${accessUrl}`,
    ],
    note: "Ubuntu 自托管：域名 A 记录指向服务器 IP 即可，无需 Cloudflare。",
  };
}

export function buildDomainSetupGuide(env: Env, hostname: string): DomainSetupGuide {
  const kind = getDomainKind(hostname, env);
  if (getDeployTarget(env) === "self-hosted") {
    return buildSelfHostedGuide(env, hostname, kind);
  }
  return buildCloudflareGuide(env, hostname, kind);
}

export { getPlatformConfig };

export async function bindPlatformWorkerDomain(
  env: Env,
  hostname: string,
): Promise<{ ok: boolean; message?: string }> {
  if (getDeployTarget(env) === "self-hosted") {
    const ip = getServerIp(env) ?? "服务器 IP";
    return {
      ok: true,
      message: `Ubuntu 自托管：请在 DNS 将 ${hostname} 的 A 记录指向 ${ip}`,
    };
  }

  if (getDomainKind(hostname, env) !== "platform_subdomain") {
    return { ok: false, message: `仅支持 ${getPlatformZone(env)} 子域名自动绑定` };
  }
  if (isReservedPlatformHostname(hostname, getPlatformZone(env))) {
    return { ok: false, message: `${hostname} 为系统保留子域，不能绑定落地页 Worker` };
  }
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/domains`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname,
        service: "lp-admin-worker",
        environment: "production",
        zone_id: env.CF_ZONE_ID,
      }),
    },
  );

  const payload = (await response.json()) as { success: boolean; errors?: Array<{ message: string; code: number }> };
  const platformZone = getPlatformZone(env);
  const ensureDns = () => createProxiedSubdomainRecord(env, hostname, platformZone);

  if (payload.success) {
    const dns = await ensureDns();
    return { ok: true, message: dns.message ?? "Worker 与 DNS 已配置" };
  }

  const err = payload.errors?.[0];
  if (err?.code === 100117) {
    const dns = await ensureDns();
    return { ok: dns.ok, message: dns.message ?? "Worker 域名可能已绑定" };
  }

  const dnsFallback = await ensureDns();
  if (dnsFallback.ok) {
    return { ok: true, message: dnsFallback.message ?? "Worker 路由 + DNS 已配置" };
  }

  return { ok: false, message: err?.message ?? dnsFallback.message ?? "Worker 域名绑定失败" };
}
