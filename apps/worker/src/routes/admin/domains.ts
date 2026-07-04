import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { customers, domains, landingPages, products } from "@lp-admin/db";
import type { DomainImportResult } from "@lp-admin/shared";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { createCustomHostname, getCustomHostnameStatus, mapSslStatus } from "../../lib/cf";
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
      downloadCount: 0,
      uniqueDownloaders: 0,
      conversionRate: 0,
    },
  }));
  return jsonResponse(enriched);
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
  return jsonResponse({ ...row, cnameTarget: row.cnameTarget ?? c.env.CNAME_TARGET });
});

app.post("/", async (c) => {
  const body = await c.req.json<{ hostname: string; customerId: number; productId: number; landingPageId: number }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const hostname = normalizeHostname(body.hostname);
  const cf = await createCustomHostname(c.env, hostname);
  const [row] = await db
    .insert(domains)
    .values({
      hostname,
      customerId: body.customerId,
      productId: body.productId,
      landingPageId: body.landingPageId,
      status: "active",
      sslStatus: mapSslStatus(cf.result?.ssl.status),
      cfCustomHostnameId: cf.result?.id ?? null,
      cnameTarget: c.env.CNAME_TARGET,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();
  return jsonResponse({ ...row, cfWarning: cf.warning ?? null }, 201);
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
      const cf = await createCustomHostname(c.env, hostname);
      await db.insert(domains).values({
        hostname,
        customerId: item.customerId,
        productId: item.productId,
        landingPageId: item.landingPageId,
        status: "active",
        sslStatus: mapSslStatus(cf.result?.ssl.status),
        cfCustomHostnameId: cf.result?.id ?? null,
        cnameTarget: c.env.CNAME_TARGET,
        createdAt: ts,
        updatedAt: ts,
      });
      result.success += 1;
      if (cf.warning) {
        if (!result.warnings) result.warnings = [];
        result.warnings.push({ hostname, message: cf.warning });
      }
    } catch (error) {
      result.failed.push({ row: i + 1, hostname: item.hostname, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return jsonResponse(result);
});

app.post("/:id/refresh-ssl", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);
  if (!row.cfCustomHostnameId) return errorResponse("No Cloudflare hostname id", 400);
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
  if (row.cfCustomHostnameId) return errorResponse("Custom Hostname already exists", 400);

  const cf = await createCustomHostname(c.env, row.hostname);
  if (!cf.result) return errorResponse(cf.warning ?? "Failed to create Custom Hostname", 400);

  const [updated] = await db
    .update(domains)
    .set({
      cfCustomHostnameId: cf.result.id,
      sslStatus: mapSslStatus(cf.result.ssl.status),
      updatedAt: nowIso(),
    })
    .where(eq(domains.id, id))
    .returning();
  return jsonResponse(updated);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (row) await invalidateDomainCache(c.env, row.hostname);
  await db.delete(domains).where(eq(domains.id, id));
  return jsonResponse({ deleted: true });
});

export default app;
