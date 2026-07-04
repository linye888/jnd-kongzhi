import { eq } from "drizzle-orm";
import { domains, landingPages } from "@lp-admin/db";
import type { LandingPageConfig } from "@lp-admin/shared";
import type { Env } from "../env";
import { mapLandingPage } from "./mappers";
import { getDb, normalizeHostname } from "./utils";

export interface ResolvedDomain {
  domainId: number;
  hostname: string;
  customerId: number;
  productId: number;
  landingPage: LandingPageConfig;
}

const CACHE_TTL = 300;

export async function resolveDomain(env: Env, hostname: string): Promise<ResolvedDomain | null> {
  const normalized = normalizeHostname(hostname);
  const cacheKey = `domain:${normalized}`;
  const cached = await env.KV.get(cacheKey);
  if (cached) return JSON.parse(cached) as ResolvedDomain;

  const db = getDb(env);
  const [domainRow] = await db.select().from(domains).where(eq(domains.hostname, normalized)).limit(1);
  if (!domainRow || domainRow.status !== "active") return null;

  const [landingRow] = await db.select().from(landingPages).where(eq(landingPages.id, domainRow.landingPageId)).limit(1);
  if (!landingRow || landingRow.status !== "active") return null;

  const resolved: ResolvedDomain = {
    domainId: domainRow.id,
    hostname: domainRow.hostname,
    customerId: domainRow.customerId,
    productId: domainRow.productId,
    landingPage: mapLandingPage(landingRow),
  };

  await env.KV.put(cacheKey, JSON.stringify(resolved), { expirationTtl: CACHE_TTL });
  return resolved;
}

export async function invalidateDomainCache(env: Env, hostname: string) {
  await env.KV.delete(`domain:${normalizeHostname(hostname)}`);
}

export async function invalidateAllDomainCaches(env: Env) {
  // KV has no list in basic usage; domain-specific invalidation is used on writes.
  await env.KV.list({ prefix: "domain:" });
}
