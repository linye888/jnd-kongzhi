import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { domains, domainStatsDaily, events, landingPages } from "@lp-admin/db";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { buildDomainSetupGuide, bindPlatformWorkerDomain } from "../../lib/domain-setup";
import { ensureWildcardPlatformDns } from "../../lib/cf";
import { getPlatformConfig } from "../../lib/platform-config";
import {
  applyLandingTemplate,
  createLandingPageForDomain,
  ensureDefaultTenant,
  isLandingTemplateId,
  updateLandingPageFields,
} from "../../lib/landing-page-factory";
import { provisionDomain, provisionDomainSaas } from "../../lib/provision-domain";
import { invalidateDomainCache } from "../../lib/domains";
import { checkDomainHealth, checkDomainsHealth } from "../../lib/domain-health";
import { getTodaySummaryForDomains } from "../../lib/stats";
import { getDb, jsonResponse, errorResponse, nowIso, normalizeHostname } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/platform-config", (c) => jsonResponse(getPlatformConfig(c.env)));

const domainSelect = {
  id: domains.id,
  hostname: domains.hostname,
  landingPageId: domains.landingPageId,
  status: domains.status,
  sslStatus: domains.sslStatus,
  cfCustomHostnameId: domains.cfCustomHostnameId,
  cnameTarget: domains.cnameTarget,
  createdAt: domains.createdAt,
  updatedAt: domains.updatedAt,
  downloadUrl: landingPages.downloadUrl,
  pixelId: landingPages.pixelId,
  templateKey: landingPages.templateKey,
  templateName: landingPages.name,
};

app.get("/", async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select(domainSelect)
    .from(domains)
    .leftJoin(landingPages, eq(domains.landingPageId, landingPages.id))
    .orderBy(domains.id);

  const statsMap = await getTodaySummaryForDomains(c.env, rows.map((r) => r.id));
  const enriched = rows.map((row) => ({
    ...row,
    downloadUrl: row.downloadUrl ?? "",
    pixelId: row.pixelId ?? "",
    templateKey: row.templateKey ?? "india-en",
    templateName: row.templateName ?? "Mini Short - 印度英语",
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

app.post("/health-check", async (c) => {
  const body = await c.req.json<{ ids?: number[] }>().catch(() => ({} as { ids?: number[] }));
  const db = getDb(c.env);
  let rows = await db
    .select({ id: domains.id, hostname: domains.hostname, status: domains.status })
    .from(domains)
    .orderBy(domains.id);

  if (body.ids?.length) {
    const idSet = new Set(body.ids);
    rows = rows.filter((row) => idSet.has(row.id));
  }

  const results = await checkDomainsHealth(c.env, rows);
  return jsonResponse({ results });
});

app.post("/rebind-platform", async (c) => {
  const db = getDb(c.env);
  const platformZone = getPlatformConfig(c.env).platformZone;
  const wildcard = await ensureWildcardPlatformDns(c.env, platformZone);
  const rows = await db.select().from(domains).orderBy(domains.id);
  const targets = rows.filter(
    (row) => row.hostname === platformZone || row.hostname.endsWith(`.${platformZone}`),
  );

  const results: Array<{ id: number; hostname: string; ok: boolean; message: string }> = [];
  for (const row of targets) {
    const bind = await bindPlatformWorkerDomain(c.env, row.hostname);
    if (bind.ok) {
      await db.update(domains).set({ sslStatus: "active", updatedAt: nowIso() }).where(eq(domains.id, row.id));
      await invalidateDomainCache(c.env, row.hostname);
    }
    results.push({
      id: row.id,
      hostname: row.hostname,
      ok: bind.ok,
      message: bind.message ?? (bind.ok ? "已绑定" : "绑定失败"),
    });
  }

  return jsonResponse({ platformZone, wildcard, results });
});

app.get("/:id/health", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return errorResponse("Invalid id", 400);
  const db = getDb(c.env);
  const [row] = await db
    .select({ id: domains.id, hostname: domains.hostname, status: domains.status })
    .from(domains)
    .where(eq(domains.id, id))
    .limit(1);
  if (!row) return errorResponse("Not found", 404);
  const health = await checkDomainHealth(c.env, row.hostname, row.status);
  return jsonResponse({ id: row.id, hostname: row.hostname, health });
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
    .select(domainSelect)
    .from(domains)
    .leftJoin(landingPages, eq(domains.landingPageId, landingPages.id))
    .where(eq(domains.id, id))
    .limit(1);
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse({
    ...row,
    downloadUrl: row.downloadUrl ?? "",
    pixelId: row.pixelId ?? "",
    templateKey: row.templateKey ?? "india-en",
    templateName: row.templateName ?? "Mini Short - 印度英语",
    cnameTarget: row.cnameTarget ?? c.env.CNAME_TARGET,
    setup: buildDomainSetupGuide(c.env, row.hostname),
  });
});

app.post("/", async (c) => {
  const body = await c.req.json<{ hostname: string; downloadUrl: string; pixelId: string; templateId?: string }>();
  if (!body.hostname?.trim()) return errorResponse("域名不能为空", 400);
  if (!body.downloadUrl?.trim()) return errorResponse("下载链接不能为空", 400);
  if (!body.pixelId?.trim()) return errorResponse("Pixel ID 不能为空", 400);

  const db = getDb(c.env);
  const ts = nowIso();
  const hostname = normalizeHostname(body.hostname);
  const tenant = await ensureDefaultTenant(db);
  const landingPage = await createLandingPageForDomain(db, {
    hostname,
    downloadUrl: body.downloadUrl.trim(),
    pixelId: body.pixelId.trim(),
    templateId: body.templateId,
    customerId: tenant.customerId,
    productId: tenant.productId,
  });

  const provision = await provisionDomain(c.env, hostname);
  const [row] = await db
    .insert(domains)
    .values({
      hostname,
      customerId: tenant.customerId,
      productId: tenant.productId,
      landingPageId: landingPage.id,
      status: "active",
      sslStatus: provision.sslStatus,
      cfCustomHostnameId: provision.cfCustomHostnameId,
      cnameTarget: c.env.CNAME_TARGET,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();
  await invalidateDomainCache(c.env, hostname);
  return jsonResponse(
    {
      ...row,
      downloadUrl: landingPage.downloadUrl,
      pixelId: landingPage.pixelId,
      templateKey: landingPage.templateKey,
      templateName: landingPage.name,
      setup: provision.setup,
      warnings: provision.warnings,
    },
    201,
  );
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{
    downloadUrl?: string;
    pixelId?: string;
    status?: string;
    templateId?: string;
    useTemplateDefaults?: boolean;
  }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [existing] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
  if (!existing) return errorResponse("Not found", 404);

  let lp;
  if (body.templateId !== undefined) {
    if (!isLandingTemplateId(body.templateId)) return errorResponse("无效的模板", 400);
    try {
      lp = await applyLandingTemplate(db, existing.landingPageId, body.templateId, {
        downloadUrl: body.downloadUrl,
        pixelId: body.pixelId,
        useTemplateDefaults: body.useTemplateDefaults,
      });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "更换模板失败", 400);
    }
  } else if (body.downloadUrl !== undefined || body.pixelId !== undefined) {
    lp = await updateLandingPageFields(db, existing.landingPageId, {
      downloadUrl: body.downloadUrl?.trim(),
      pixelId: body.pixelId?.trim(),
    });
  }

  const [row] = await db
    .update(domains)
    .set({
      status: body.status ?? existing.status,
      updatedAt: ts,
    })
    .where(eq(domains.id, id))
    .returning();

  if (!lp) {
    [lp] = await db.select().from(landingPages).where(eq(landingPages.id, existing.landingPageId)).limit(1);
  }
  await invalidateDomainCache(c.env, existing.hostname);
  return jsonResponse({
    ...row,
    downloadUrl: lp?.downloadUrl ?? "",
    pixelId: lp?.pixelId ?? "",
    templateKey: lp?.templateKey ?? "india-en",
    templateName: lp?.name ?? "Mini Short - 印度英语",
  });
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
  await db.delete(landingPages).where(eq(landingPages.id, row.landingPageId));
  return jsonResponse({ deleted: true });
});

export default app;
