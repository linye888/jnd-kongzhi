import type { Env } from "../env";

export type DeployTarget = "cloudflare" | "self-hosted";

export function isIpAddress(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

export function getDeployTarget(env: Env): DeployTarget {
  if (env.DEPLOY_TARGET === "cloudflare" || env.DEPLOY_TARGET === "self-hosted") {
    return env.DEPLOY_TARGET;
  }
  if (env.CF_API_TOKEN && env.CF_ZONE_ID) return "cloudflare";
  return "self-hosted";
}

export function getServerIp(env: Env): string | undefined {
  if (env.SERVER_IP) return env.SERVER_IP;
  const zone = env.PLATFORM_ZONE ?? "";
  return isIpAddress(zone) ? zone : undefined;
}

export function getPlatformConfig(env: Env) {
  const platformZone = env.PLATFORM_ZONE ?? "example.com";
  const serverIp = getServerIp(env);
  return {
    deployTarget: getDeployTarget(env),
    platformZone,
    serverIp,
    fallbackOrigin: env.FALLBACK_ORIGIN ?? (serverIp ?? `origin.${platformZone}`),
    cnameTarget: env.CNAME_TARGET ?? (serverIp ?? `customers.${platformZone}`),
  };
}
