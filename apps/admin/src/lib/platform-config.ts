import type { PlatformConfig } from "@lp-admin/shared";
import { api } from "./api";

let cached: PlatformConfig | null = null;

export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (cached) return cached;
  cached = await api<PlatformConfig>("/api/admin/domains/platform-config");
  return cached;
}

export function isSelfHosted(config: PlatformConfig) {
  return config.deployTarget === "self-hosted";
}

export function domainPlaceholder(config: PlatformConfig) {
  if (isSelfHosted(config)) {
    return config.serverIp ? `promo.example.com（A 记录 → ${config.serverIp}）` : "promo.example.com";
  }
  return `india.${config.platformZone}`;
}
