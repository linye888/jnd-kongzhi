import type { Env } from "../env";

interface CustomHostnameResult {
  id: string;
  hostname: string;
  ssl: { status: string };
}

export async function createCustomHostname(env: Env, hostname: string): Promise<CustomHostnameResult | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.CF_ZONE_ID) return null;

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

  const payload = (await response.json()) as { success: boolean; result?: CustomHostnameResult };
  if (!payload.success || !payload.result) return null;
  return payload.result;
}

export async function getCustomHostnameStatus(env: Env, hostnameId: string): Promise<string | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN || !env.CF_ZONE_ID) return null;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames/${hostnameId}`,
    { headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` } },
  );
  const payload = (await response.json()) as { success: boolean; result?: CustomHostnameResult };
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
