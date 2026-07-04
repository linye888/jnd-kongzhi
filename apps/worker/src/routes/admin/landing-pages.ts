import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { landingPages } from "@lp-admin/db";
import { renderLandingPage } from "@lp-admin/templates";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { mapLandingPage } from "../../lib/mappers";
import { getDb, jsonResponse, errorResponse, nowIso } from "../../lib/utils";
import type { DramaItem, GuideStep } from "@lp-admin/shared";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(landingPages).orderBy(landingPages.id);
  return jsonResponse(rows.map(mapLandingPage));
});

app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(landingPages).where(eq(landingPages.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse(mapLandingPage(row));
});

app.get("/:id/preview", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [row] = await db.select().from(landingPages).where(eq(landingPages.id, id)).limit(1);
  if (!row) return errorResponse("Not found", 404);
  const html = renderLandingPage(mapLandingPage(row), "preview-visitor");
  return c.html(html);
});

app.post("/", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [row] = await db
    .insert(landingPages)
    .values({
      name: String(body.name),
      customerId: Number(body.customerId),
      productId: Number(body.productId),
      locale: String(body.locale ?? "en"),
      status: String(body.status ?? "active"),
      pageTitle: String(body.pageTitle),
      metaDescription: String(body.metaDescription),
      brandName: String(body.brandName),
      brandSubtitle: String(body.brandSubtitle),
      logoUrl: String(body.logoUrl),
      bannerUrl: String(body.bannerUrl),
      rewardText: String(body.rewardText),
      downloadUrl: String(body.downloadUrl),
      pixelId: String(body.pixelId),
      leadStorageKey: String(body.leadStorageKey),
      heroTag: String(body.heroTag),
      heroTitle: String(body.heroTitle),
      heroDescription: String(body.heroDescription),
      heroCtaText: String(body.heroCtaText),
      securityBadgeText: String(body.securityBadgeText),
      dramasSectionTitle: String(body.dramasSectionTitle),
      dramasSectionSubtitle: String(body.dramasSectionSubtitle),
      dramasJson: JSON.stringify(body.dramas ?? []),
      installGuideTitle: String(body.installGuideTitle),
      installGuideSubtitle: String(body.installGuideSubtitle),
      installStepsJson: JSON.stringify(body.installSteps ?? []),
      finalTitle: String(body.finalTitle),
      finalDescription: String(body.finalDescription),
      finalCtaText: String(body.finalCtaText),
      footerText: String(body.footerText),
      modalTitlePrefix: String(body.modalTitlePrefix),
      modalDescription: String(body.modalDescription),
      modalCtaText: String(body.modalCtaText),
      modalCancelText: String(body.modalCancelText),
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();
  return jsonResponse(mapLandingPage(row), 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Record<string, unknown>>();
  const db = getDb(c.env);
  const ts = nowIso();
  const update: Record<string, unknown> = { updatedAt: ts };
  const fields = [
    "name", "customerId", "productId", "locale", "status", "pageTitle", "metaDescription", "brandName", "brandSubtitle",
    "logoUrl", "bannerUrl", "rewardText", "downloadUrl", "pixelId", "leadStorageKey", "heroTag", "heroTitle",
    "heroDescription", "heroCtaText", "securityBadgeText", "dramasSectionTitle", "dramasSectionSubtitle",
    "installGuideTitle", "installGuideSubtitle", "finalTitle", "finalDescription", "finalCtaText", "footerText",
    "modalTitlePrefix", "modalDescription", "modalCtaText", "modalCancelText",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  if (body.dramas !== undefined) update.dramasJson = JSON.stringify(body.dramas as DramaItem[]);
  if (body.installSteps !== undefined) update.installStepsJson = JSON.stringify(body.installSteps as GuideStep[]);

  const [row] = await db.update(landingPages).set(update).where(eq(landingPages.id, id)).returning();
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse(mapLandingPage(row));
});

app.post("/:id/duplicate", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  const [source] = await db.select().from(landingPages).where(eq(landingPages.id, id)).limit(1);
  if (!source) return errorResponse("Not found", 404);
  const ts = nowIso();
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;
  const [row] = await db.insert(landingPages).values({ ...rest, name: `${source.name} (Copy)`, createdAt: ts, updatedAt: ts }).returning();
  return jsonResponse(mapLandingPage(row), 201);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  await db.delete(landingPages).where(eq(landingPages.id, id));
  return jsonResponse({ deleted: true });
});

export default app;
