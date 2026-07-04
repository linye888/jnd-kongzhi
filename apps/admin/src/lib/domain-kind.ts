import type { DomainKind } from "@lp-admin/shared";

const PLATFORM_ZONE = "minishort.sbs";

export function getDomainKind(hostname: string): DomainKind {
  const host = hostname.toLowerCase();
  if (host === PLATFORM_ZONE || host.endsWith(`.${PLATFORM_ZONE}`)) return "platform_subdomain";
  return "customer_owned";
}

export function dnsTargetLabel(hostname: string, originTarget = "origin.minishort.sbs"): string {
  return getDomainKind(hostname) === "platform_subdomain" ? "平台自动" : originTarget;
}
