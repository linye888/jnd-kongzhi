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

/** 不应绑定 Worker 落地页的平台子域（admin 走 Pages，customers 为 SaaS CNAME 目标） */
export const RESERVED_LANDING_SUBDOMAINS = new Set(["admin", "customers"]);

export function isReservedPlatformHostname(hostname: string, platformZone: string): boolean {
  const host = hostname.toLowerCase();
  const zone = platformZone.toLowerCase();
  if (host === zone || !host.endsWith(`.${zone}`)) return false;
  const label = host.slice(0, -(zone.length + 1));
  return !label.includes(".") && RESERVED_LANDING_SUBDOMAINS.has(label);
}

async function cfFetch(env: Env, url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** 从 Worker 自定义域解绑（避免 admin 等被 Worker 接管） */
export async function detachWorkerCustomDomain(env: Env, hostname: string): Promise<DnsRecordResult> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const listRes = await cfFetch(
    env,
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/domains`,
  );
  const listPayload = (await listRes.json()) as {
    success: boolean;
    result?: Array<{ id: string; hostname: string }>;
  };

  const matches = (listPayload.result ?? []).filter(
    (item) => item.hostname.toLowerCase() === hostname.toLowerCase(),
  );

  if (!listPayload.success || matches.length === 0) {
    return { ok: true, message: "Worker 自定义域未绑定" };
  }

  for (const item of matches) {
    await cfFetch(
      env,
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/domains/${item.id}`,
      { method: "DELETE" },
    );
  }

  return { ok: true, message: "已从 Worker 解绑" };
}

/** 恢复 admin 子域 CNAME 到 Cloudflare Pages */
export async function restoreAdminPagesDns(env: Env, platformZone: string): Promise<DnsRecordResult> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const adminFqdn = `admin.${platformZone}`;
  const pagesTarget = env.ADMIN_PAGES_TARGET ?? "lp-admin-6rt.pages.dev";

  await detachWorkerCustomDomain(env, adminFqdn);

  const wildcardRes = await cfFetch(
    env,
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records?type=A&name=${encodeURIComponent(`*.${platformZone}`)}`,
  );
  const wildcardPayload = (await wildcardRes.json()) as { success: boolean; result?: Array<{ id: string }> };
  if (wildcardPayload.success && wildcardPayload.result?.length) {
    for (const record of wildcardPayload.result) {
      await cfFetch(
        env,
        `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records/${record.id}`,
        { method: "DELETE" },
      );
    }
  }

  const listRes = await cfFetch(
    env,
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records?name=${encodeURIComponent(adminFqdn)}`,
  );
  const listPayload = (await listRes.json()) as {
    success: boolean;
    result?: Array<{ id: string; type: string; content: string }>;
  };

  if (listPayload.success && listPayload.result?.length) {
    const hasCorrectCname = listPayload.result.some(
      (record) => record.type === "CNAME" && record.content.replace(/\.$/, "") === pagesTarget,
    );
    if (!hasCorrectCname) {
      for (const record of listPayload.result) {
        await cfFetch(
          env,
          `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records/${record.id}`,
          { method: "DELETE" },
        );
      }
    }
  }

  const verifyRes = await cfFetch(
    env,
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records?name=${encodeURIComponent(adminFqdn)}`,
  );
  const verifyPayload = (await verifyRes.json()) as {
    success: boolean;
    result?: Array<{ type: string; content: string }>;
  };
  const hasCname = verifyPayload.result?.some(
    (record) => record.type === "CNAME" && record.content.replace(/\.$/, "") === pagesTarget,
  );
  if (hasCname) {
    return { ok: true, message: "Admin Pages DNS 已正确" };
  }

  const createRes = await cfFetch(env, `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name: "admin",
      content: pagesTarget,
      proxied: true,
      ttl: 1,
      comment: "lp-admin Cloudflare Pages",
    }),
  });

  const createPayload = (await createRes.json()) as { success: boolean; errors?: Array<{ message: string }> };
  if (createPayload.success) {
    return { ok: true, message: `已恢复 admin → ${pagesTarget}` };
  }

  return { ok: false, message: createPayload.errors?.[0]?.message ?? "Admin DNS 恢复失败" };
}

/** 为平台子域创建橙云 A 记录，配合 Worker 自定义域使用 */
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

function splitHostname(hostname: string): { zone: string; recordName: string } | null {
  const host = hostname.toLowerCase();
  const parts = host.split(".");
  if (parts.length < 2) return null;
  const zone = parts.slice(-2).join(".");
  const recordName = parts.length === 2 ? "@" : parts.slice(0, -2).join(".");
  return { zone, recordName };
}

async function resolveCloudflareZoneId(env: Env, zoneName: string): Promise<string | null> {
  if (!env.CF_API_TOKEN) return null;
  const res = await cfFetch(env, `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}&status=active`);
  const payload = (await res.json()) as { success: boolean; result?: Array<{ id: string; name: string }> };
  if (!payload.success || !payload.result?.length) return null;
  const match = payload.result.find((z) => z.name.toLowerCase() === zoneName.toLowerCase());
  return match?.id ?? payload.result[0]?.id ?? null;
}

/** 占位 A 记录 IP，橙云代理后由 Worker 自定义域接管流量 */
const WORKER_DNS_PLACEHOLDER_IP = "192.0.2.1";

/** 为客户自有域（同 CF 账号，如 mx.minishort.top）创建橙云 A 记录，配合 Worker 自定义域；避免 CNAME 跨 Zone 522 */
export async function provisionCustomerOwnedDomainDns(
  env: Env,
  hostname: string,
  _originTarget?: string,
): Promise<DnsRecordResult> {
  if (!env.CF_API_TOKEN) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const parsed = splitHostname(hostname);
  if (!parsed) return { ok: false, message: "域名格式无效" };

  const zoneId = await resolveCloudflareZoneId(env, parsed.zone);
  if (!zoneId) {
    return { ok: false, message: `未找到 Cloudflare Zone：${parsed.zone}（请确认域名在同一 CF 账号）` };
  }

  const fqdn = parsed.recordName === "@" ? parsed.zone : `${parsed.recordName}.${parsed.zone}`;

  const listRes = await cfFetch(
    env,
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}`,
  );
  const listPayload = (await listRes.json()) as {
    success: boolean;
    result?: Array<{ id: string; type: string; content: string; proxied: boolean }>;
  };

  if (listPayload.success && listPayload.result?.length) {
    const correct = listPayload.result.find(
      (r) => r.type === "A" && r.content === WORKER_DNS_PLACEHOLDER_IP && r.proxied,
    );
    if (correct) return { ok: true, message: `DNS 已正确：${fqdn} → Worker（橙云 A）` };

    for (const record of listPayload.result) {
      await cfFetch(env, `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`, {
        method: "DELETE",
      });
    }
  }

  const createRes = await cfFetch(env, `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "A",
      name: parsed.recordName,
      content: WORKER_DNS_PLACEHOLDER_IP,
      proxied: true,
      ttl: 1,
      comment: `lp-admin landing ${hostname}`,
    }),
  });

  const createPayload = (await createRes.json()) as { success: boolean; errors?: Array<{ message: string; code: number }> };
  if (createPayload.success) {
    return { ok: true, message: `已创建 A 记录：${fqdn} → Worker（橙云）` };
  }

  const err = createPayload.errors?.[0];
  if (err?.code === 81057) return { ok: true, message: "DNS 记录已存在" };
  return { ok: false, message: err?.message ?? "DNS 创建失败" };
}

/** 将任意 hostname 绑定到 lp-admin-worker（用于客户自有域子域） */
export async function bindLandingWorkerDomain(env: Env, hostname: string): Promise<DnsRecordResult> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return { ok: false, message: "未配置 Cloudflare API 凭证" };
  }

  const parsed = splitHostname(hostname);
  if (!parsed) return { ok: false, message: "域名格式无效" };

  const zoneId = await resolveCloudflareZoneId(env, parsed.zone);
  if (!zoneId) {
    return { ok: false, message: `未找到 Cloudflare Zone：${parsed.zone}` };
  }

  const response = await cfFetch(
    env,
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/domains`,
    {
      method: "PUT",
      body: JSON.stringify({
        hostname,
        service: "lp-admin-worker",
        environment: "production",
        zone_id: zoneId,
      }),
    },
  );

  const payload = (await response.json()) as { success: boolean; errors?: Array<{ message: string; code: number }> };
  if (payload.success) return { ok: true, message: "Worker 自定义域已绑定" };

  const err = payload.errors?.[0];
  if (err?.code === 100117) return { ok: true, message: "Worker 自定义域可能已绑定" };
  return { ok: false, message: err?.message ?? "Worker 绑定失败" };
}
