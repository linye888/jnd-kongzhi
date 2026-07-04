import type { Env } from "../env";

export type DomainKind = "platform_subdomain" | "customer_owned";

export interface DomainSetupGuide {
  kind: DomainKind;
  hostname: string;
  cnameTarget: string;
  originTarget: string;
  steps: string[];
  note?: string;
}

const PLATFORM_ZONE = "minishort.sbs";

export function getDomainKind(hostname: string): DomainKind {
  const host = hostname.toLowerCase();
  if (host === PLATFORM_ZONE || host.endsWith(`.${PLATFORM_ZONE}`)) return "platform_subdomain";
  return "customer_owned";
}

export function buildDomainSetupGuide(env: Env, hostname: string): DomainSetupGuide {
  const originTarget = env.FALLBACK_ORIGIN ?? "origin.minishort.sbs";
  const cnameTarget = env.CNAME_TARGET ?? "customers.minishort.sbs";
  const kind = getDomainKind(hostname);

  if (kind === "platform_subdomain") {
    return {
      kind,
      hostname,
      cnameTarget,
      originTarget,
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

export async function bindPlatformWorkerDomain(
  env: Env,
  hostname: string,
): Promise<{ ok: boolean; message?: string }> {
  if (getDomainKind(hostname) !== "platform_subdomain") {
    return { ok: false, message: "仅支持 minishort.sbs 子域名自动绑定" };
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
  if (payload.success) return { ok: true };

  const err = payload.errors?.[0];
  if (err?.code === 100117) {
    // already has DNS — try assuming already bound
    return { ok: true, message: "Worker 域名可能已绑定" };
  }
  return { ok: false, message: err?.message ?? "Worker 域名绑定失败" };
}
