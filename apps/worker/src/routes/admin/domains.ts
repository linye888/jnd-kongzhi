import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { customers, domains, domainStatsDaily, events, landingPages, products } from "@lp-admin/db";
import type { DomainImportResult } from "@lp-admin/shared";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { buildDomainSetupGuide, bindPlatformWorkerDomain } from "../../lib/domain-setup";
import { getCustomHostnameStatus, mapSslStatus } from "../../lib/cf";
import { provisionDomain, provisionDomainSaas } from "../../lib/provision-domain";
import { invalidateDomainCache } from "../../lib/domains";
import { getTodaySummaryForDomains } from "../../lib/stats";
import { getDb, jsonResponse, errorResponse, nowIso, normalizeHostname } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select({
      id: domains.id,
      hostname: domains.hostname,
      customerId: domains.customerId,
      productId: domains.productId,
      landingPageId: domains.landingPageId,
      status: domains.status,
      sslStatus: domains.sslStatus,
      cfCustomHostnameId: domains.cfCustomHostnameId,
      cnameTarget: domains.cnameTarget,
      createdAt: domains.createdAt,
      updatedAt: domains.updatedAt,
      customerName: customers.name,
      productName: products.name,
      landingPageName: landingPages.name,
    })
    .from(domains)
    .leftJoin(customers, eq(domains.customerId, customers.id))
    .leftJoin(products, eq(domains.productId, products.id))
    .leftJoin(landingPages, eq(domains.landingPageId, landingPages.id))
    .orderBy(domains.id);

  const statsMap = await getTodaySummaryForDomains(c.env, rows.map((r) => r.id));
  const enriched = rows.map((row) => ({
    ...row,
    cnameTarget: row.cnameTarget ?? c.env.CNAME_TARGET,
    todayStats: statsMap.get(row.id) ?? {
      pageViews: 0,
      uniqueVisitors: 0,
      botPageViews: 0,
      downloadCount: 0,
      uniqueDownloaders: 0,
      conversionRate: 0,
    },
  }));
  return jsonResponse(enriched);
});

app.get("/:id/setup", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse(buildDomainSetupGuide(c.env, row.hostname));
});

app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db
    .select({
      id: domains.id,
      hostname: domains.hostname,
      customerId: domains.customerId,
      productId: domains.productId,
      landingPageId: domains.landingPageId,
      status: domains.status,
      sslStatus: domains.sslStatus,
      cfCustomHostnameId: domains.cfCustomHostnameId,
      cnameTarget: domains.cnameTarget,
      createdAt: domains.createdAt,
      updatedAt: domains.updatedAt,
      customerName: customers.name,
      productName: products.name,
      landingPageName: landingPages.name,
    })
    .from(domains)
    .leftJoin(customers, eq(domains.customerId, customers.id))
    .leftJoin(products, eq(domains.productId, products.id))
    .leftJoin(landingPages, eq(domains.landingPageId, landingPages.id))
    .where(eq(domains.id, id))
    .limit(1);
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse({
    ...row,
    cnameTarget: row.cnameTarget ?? c.env.CNAME_TARGET,
    setup: buildDomainSetupGuide(c.env, row.hostname),
  });
});

app.post("/", async (c) => {
  const body = await c.req.json<{ hostname: string; customerId: number; productId: number; landingPageId: number }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const hostname = normalizeHostname(body.hostname);
  const provision = await provisionDomain(c.env, hostname);
  const [row] = await db
    .insert(domains)
    .values({
      hostname,
      customerId: body.customerId,
      productId: body.productId,
      landingPageId: body.landingPageId,
      status: "active",
      sslStatus: provision.sslStatus,
      cfCustomHostnameId: provision.cfCustomHostnameId,
      cnameTarget: c.env.CNAME_TARGET,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();
  await invalidateDomainCache(c.env, hostname);
  return jsonResponse({ ...row, setup: provision.setup, warnings: provision.warnings }, 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ landingPageId?: number; status?: string; customerId?: number; productId?: number }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [existing] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!existing) return errorResponse("Not found", 404);
  const [row] = await db
    .update(domains)
    .set({
      landingPageId: body.landingPageId ?? existing.landingPageId,
      status: body.status ?? existing.status,
      customerId: body.customerId ?? existing.customerId,
      productId: body.productId ?? existing.productId,
      updatedAt: ts,
    })
    .where(eq(domains.id, id))
    .returning();
  await invalidateDomainCache(c.env, existing.hostname);
  return jsonResponse(row);
});

app.post("/import", async (c) => {
  const body = await c.req.json<{ rows: Array<{ hostname: string; customerId: number; productId: number; landingPageId: number }> }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const result: DomainImportResult = { success: 0, failed: [], warnings: [] };

  for (let i = 0; i < body.rows.length; i++) {
    const item = body.rows[i];
    try {
      const hostname = normalizeHostname(item.hostname);
      const provision = await provisionDomain(c.env, hostname);
      await db.insert(domains).values({
        hostname,
        customerId: item.customerId,
        productId: item.productId,
        landingPageId: item.landingPageId,
        status: "active",
        sslStatus: provision.sslStatus,
        cfCustomHostnameId: provision.cfCustomHostnameId,
        cnameTarget: c.env.CNAME_TARGET,
        createdAt: ts,
        updatedAt: ts,
      });
      await invalidateDomainCache(c.env, hostname);
      result.success += 1;
      for (const msg of provision.warnings) {
        if (!result.warnings) result.warnings = [];
        result.warnings.push({ hostname, message: msg });
      }
    } catch (error) {
      result.failed.push({ row: i + 1, hostname: item.hostname, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return jsonResponse(result);
});

app.post("/:id/bind-worker", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);

  const bind = await bindPlatformWorkerDomain(c.env, row.hostname);
  if (!bind.ok) return errorResponse(bind.message ?? "绑定失败", 400);

  const [updated] = await db
    .update(domains)
    .set({ sslStatus: "active", updatedAt: nowIso() })
    .where(eq(domains.id, id))
    .returning();
  return jsonResponse({ ...updated, setup: buildDomainSetupGuide(c.env, row.hostname), message: bind.message ?? "Worker 已绑定" });
});

app.post("/:id/refresh-ssl", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);
  if (!row.cfCustomHostnameId) {
    return jsonResponse({
      ...row,
      setup: buildDomainSetupGuide(c.env, row.hostname),
      message: "方案 A：SSL 由客户 Cloudflare 管理，请客户在控制台查看证书状态",
    });
  }
  const status = await getCustomHostnameStatus(c.env, row.cfCustomHostnameId);
  const sslStatus = mapSslStatus(status);
  const [updated] = await db.update(domains).set({ sslStatus, updatedAt: nowIso() }).where(eq(domains.id, id)).returning();
  return jsonResponse(updated);
});

app.post("/:id/provision-ssl", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);

  const useSaas = c.req.query("mode") === "saas";
  const provision = useSaas ? await provisionDomainSaas(c.env, row.hostname) : await provisionDomain(c.env, row.hostname);
  if (!useSaas && provision.warnings.length && !provision.cfCustomHostnameId) {
    const [updated] = await db
      .update(domains)
      .set({ sslStatus: provision.sslStatus, updatedAt: nowIso() })
      .where(eq(domains.id, id))
      .returning();
    return jsonResponse({ ...updated, setup: provision.setup, warnings: provision.warnings });
  }
  if (!provision.cfCustomHostnameId && useSaas) {
    return errorResponse(provision.warnings.join(" ") || "Failed to create Custom Hostname", 400);
  }

  const [updated] = await db
    .update(domains)
    .set({
      cfCustomHostnameId: provision.cfCustomHostnameId,
      sslStatus: provision.sslStatus,
      updatedAt: nowIso(),
    })
    .where(eq(domains.id, id))
    .returning();
  return jsonResponse({ ...updated, setup: provision.setup, warnings: provision.warnings });
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);
  await invalidateDomainCache(c.env, row.hostname);
  await db.delete(events).where(eq(events.domainId, id));
  await db.delete(domainStatsDaily).where(eq(domainStatsDaily.domainId, id));
  await db.delete(domains).where(eq(domains.id, id));
  return jsonResponse({ deleted: true });
});

export default app;
