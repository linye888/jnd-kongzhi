import type { Env } from "../env";

interface CustomHostnameResult {
  id: string;
  hostname: string;
  ssl: { status: string };
}

interface CfErrorPayload {
  success: boolean;
  result?: CustomHostnameResult;
  errors?: Array<{ code: number; message: string }>;
}

export interface CustomHostnameOutcome {
  result: CustomHostnameResult | null;
  warning?: string;
}

function mapCfError(code?: number, message?: string): string {
  if (code === 1404) {
    return "Cloudflare for SaaS 未开通（错误 1404）。需升级套餐或联系 Cloudflare 开通 SSL for SaaS 配额。";
  }
  if (code === 9109) {
    return "API Token 缺少 Zone SSL 权限，无法创建 Custom Hostname。";
  }
  return message ? `Custom Hostname 创建失败：${message}` : "Custom Hostname 创建失败";
}

export async function createCustomHostname(env: Env, hostname: string): Promise<CustomHostnameOutcome> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { result: null, warning: "未配置 Cloudflare API 凭证，域名已入库但未创建 SSL。" };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname,
        ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
      }),
    },
  );

  const payload = (await response.json()) as CfErrorPayload;
  if (!payload.success || !payload.result) {
    const err = payload.errors?.[0];
    return { result: null, warning: mapCfError(err?.code, err?.message) };
  }
  return { result: payload.result };
}

export async function getCustomHostnameStatus(env: Env, hostnameId: string): Promise<string | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.CF_ZONE_ID) return null;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames/${hostnameId}`,
    { headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` } },
  );
  const payload = (await response.json()) as CfErrorPayload;
  if (!payload.success || !payload.result) return null;
  return payload.result.ssl.status;
}

export function mapSslStatus(cfStatus: string | null | undefined): "pending" | "active" | "failed" | "unknown" {
  if (!cfStatus) return "unknown";
  if (cfStatus === "active") return "active";
  if (cfStatus === "pending_validation" || cfStatus === "pending_issuance" || cfStatus === "pending_deployment") return "pending";
  if (cfStatus === "deleted" || cfStatus === "validation_timed_out" || cfStatus === "issuance_timed_out") return "failed";
  return "unknown";
}

interface DnsRecordResult {
  ok: boolean;
  message?: string;
}

/** 为平台子域创建橙云 A 记录，配合 Worker 路由使用（Workers Domains API 失败时的兜底） */
export async function createProxiedSubdomainRecord(env: Env, hostname: string, platformZone: string): Promise<DnsRecordResult> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const host = hostname.toLowerCase();
  const zone = platformZone.toLowerCase();
  if (host !== zone && !host.endsWith(`.${zone}`)) {
    return { ok: false, message: "非平台子域" };
  }

  const recordName = host === zone ? zone : host.slice(0, -(zone.length + 1));

  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records?type=A&name=${encodeURIComponent(recordName === zone ? zone : `${recordName}.${zone}`)}`,
    { headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` } },
  );
  const listPayload = (await listRes.json()) as { success: boolean; result?: Array<{ id: string }> };
  if (listPayload.success && listPayload.result?.length) {
    return { ok: true, message: "DNS 记录已存在" };
  }

  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "A",
        name: recordName,
        content: "192.0.2.1",
        proxied: true,
        ttl: 1,
        comment: "lp-admin platform subdomain",
      }),
    },
  );

  const createPayload = (await createRes.json()) as { success: boolean; errors?: Array<{ message: string; code: number }> };
  if (createPayload.success) {
    return { ok: true, message: "已创建 DNS 记录（Worker 路由接管）" };
  }

  const err = createPayload.errors?.[0];
  if (err?.code === 81057) {
    return { ok: true, message: "DNS 记录已存在" };
  }
  return { ok: false, message: err?.message ?? "DNS 记录创建失败" };
}

/** 创建 *.platformZone 通配符橙云 A 记录，所有子域一次生效 */
export async function ensureWildcardPlatformDns(env: Env, platformZone: string): Promise<DnsRecordResult> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const wildcardFqdn = `*.${platformZone}`;
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records?type=A&name=${encodeURIComponent(wildcardFqdn)}`,
    { headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` } },
  );
  const listPayload = (await listRes.json()) as { success: boolean; result?: Array<{ id: string }> };
  if (listPayload.success && listPayload.result?.length) {
    return { ok: true, message: "通配符 DNS 已存在" };
  }

  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "A",
        name: "*",
        content: "192.0.2.1",
        proxied: true,
        ttl: 1,
        comment: "lp-admin wildcard platform subdomains",
      }),
    },
  );

  const createPayload = (await createRes.json()) as { success: boolean; errors?: Array<{ message: string; code: number }> };
  if (createPayload.success) {
    return { ok: true, message: "已创建通配符 DNS（*.platformZone）" };
  }

  const err = createPayload.errors?.[0];
  if (err?.code === 81057) {
    return { ok: true, message: "通配符 DNS 已存在" };
  }
  return { ok: false, message: err?.message ?? "通配符 DNS 创建失败" };
}
