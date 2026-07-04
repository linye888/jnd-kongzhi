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
