import type { DomainKind, PlatformConfig } from "@lp-admin/shared";

export function getDomainKind(hostname: string, config: PlatformConfig): DomainKind {
  const platformZone = config.platformZone.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(platformZone)) return "customer_owned";
  const host = hostname.toLowerCase();
  if (host === platformZone || host.endsWith(`.${platformZone}`)) return "platform_subdomain";
  return "customer_owned";
}

export function dnsTargetLabel(hostname: string, config: PlatformConfig): string {
  if (config.deployTarget === "self-hosted") return config.serverIp ?? config.platformZone;
  return getDomainKind(hostname, config) === "platform_subdomain" ? "平台自动" : config.fallbackOrigin;
}
