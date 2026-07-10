import type { Env } from "../env";

export type DeployTarget = "cloudflare" | "self-hosted";

export function isIpAddress(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

/** Ubuntu 独立版固定为 self-hosted，不读取 Cloudflare 凭证 */
export function getDeployTarget(env: Env): DeployTarget {
  if (env.DEPLOY_TARGET === "self-hosted") return "self-hosted";
  if (env.DEPLOY_TARGET === "cloudflare") return "cloudflare";
  if (env.CF_API_TOKEN && env.CF_ZONE_ID) return "cloudflare";
  return "self-hosted";
}

export function getServerIp(env: Env): string | undefined {
  if (env.SERVER_IP) return env.SERVER_IP;
  const zone = env.PLATFORM_ZONE ?? "";
  return isIpAddress(zone) ? zone : undefined;
}

export function getPlatformConfig(env: Env) {
  const deployTarget = getDeployTarget(env);
  const platformZone = env.PLATFORM_ZONE ?? "example.com";
  const serverIp = getServerIp(env);

  if (deployTarget === "self-hosted") {
    const target = serverIp ?? platformZone;
    return {
      deployTarget,
      platformZone,
      serverIp,
      fallbackOrigin: target,
      cnameTarget: target,
    };
  }

  return {
    deployTarget,
    platformZone,
    serverIp,
    fallbackOrigin: env.FALLBACK_ORIGIN ?? `origin.${platformZone}`,
    cnameTarget: env.CNAME_TARGET ?? `customers.${platformZone}`,
  };
}
