import { getLandingTemplate, isLandingTemplateId, listLandingTemplateOptions } from "@lp-admin/templates";
import { eq } from "drizzle-orm";
import { customers, domains, landingPages, products } from "@lp-admin/db";
import { getDb, nowIso } from "./utils";

type Db = ReturnType<typeof getDb>;

export async function ensureDefaultTenant(db: Db) {
  const [existingCustomer] = await db.select().from(customers).limit(1);
  if (existingCustomer) {
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.customerId, existingCustomer.id))
      .limit(1);
    if (existingProduct) {
      return { customerId: existingCustomer.id, productId: existingProduct.id };
    }
  }

  const ts = nowIso();
  const [customer] = await db
    .insert(customers)
    .values({ name: "Default", notes: null, createdAt: ts, updatedAt: ts })
    .returning();
  const [product] = await db
    .insert(products)
    .values({ customerId: customer.id, name: "Default", createdAt: ts, updatedAt: ts })
    .returning();
  return { customerId: customer.id, productId: product.id };
}

export async function createLandingPageForDomain(
  db: Db,
  input: {
    hostname: string;
    downloadUrl: string;
    pixelId: string;
    templateId?: string;
    customerId: number;
    productId: number;
  },
) {
  const templateId = isLandingTemplateId(input.templateId ?? "") ? input.templateId! : "india-en";
  const template = getLandingTemplate(templateId);
  const preset = template.preset;
  const ts = nowIso();
  const [row] = await db
    .insert(landingPages)
    .values({
      name: template.name,
      templateKey: template.id,
      customerId: input.customerId,
      productId: input.productId,
      locale: preset.locale,
      status: preset.status,
      pageTitle: preset.pageTitle,
      metaDescription: preset.metaDescription,
      brandName: preset.brandName,
      brandSubtitle: preset.brandSubtitle,
      logoUrl: preset.logoUrl,
      bannerUrl: preset.bannerUrl,
      rewardText: preset.rewardText,
      downloadUrl: input.downloadUrl,
      pixelId: input.pixelId,
      leadStorageKey: preset.leadStorageKey,
      heroTag: preset.heroTag,
      heroTitle: preset.heroTitle,
      heroDescription: preset.heroDescription,
      heroCtaText: preset.heroCtaText,
      securityBadgeText: preset.securityBadgeText,
      dramasSectionTitle: preset.dramasSectionTitle,
      dramasSectionSubtitle: preset.dramasSectionSubtitle,
      dramasJson: JSON.stringify(preset.dramas),
      installGuideTitle: preset.installGuideTitle,
      installGuideSubtitle: preset.installGuideSubtitle,
      installStepsJson: JSON.stringify(preset.installSteps),
      finalTitle: preset.finalTitle,
      finalDescription: preset.finalDescription,
      finalCtaText: preset.finalCtaText,
      footerText: preset.footerText,
      modalTitlePrefix: preset.modalTitlePrefix,
      modalDescription: preset.modalDescription,
      modalCtaText: preset.modalCtaText,
      modalCancelText: preset.modalCancelText,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();
  return row;
}

export async function cloneLandingPage(db: Db, landingPageId: number) {
  const [existing] = await db.select().from(landingPages).where(eq(landingPages.id, landingPageId)).limit(1);
  if (!existing) throw new Error("Landing page not found");
  const ts = nowIso();
  const { id: _id, ...data } = existing;
  const [row] = await db.insert(landingPages).values({ ...data, createdAt: ts, updatedAt: ts }).returning();
  return row;
}

/** 若多个域名共用同一落地页，为当前域名克隆一份独立副本，避免改链接时互相影响 */
export async function ensureDedicatedLandingPage(db: Db, domainId: number): Promise<number> {
  const [domain] = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);
  if (!domain) throw new Error("Domain not found");

  const sharing = await db
    .select({ id: domains.id })
    .from(domains)
    .where(eq(domains.landingPageId, domain.landingPageId));

  if (sharing.length <= 1) {
    return domain.landingPageId;
  }

  const cloned = await cloneLandingPage(db, domain.landingPageId);
  const ts = nowIso();
  await db
    .update(domains)
    .set({ landingPageId: cloned.id, updatedAt: ts })
    .where(eq(domains.id, domainId));

  return cloned.id;
}

/** 一次性拆分所有共用落地页的域名（保留每组第一个域名仍指向原记录） */
export async function splitAllSharedLandingPages(db: Db) {
  const allDomains = await db.select({ id: domains.id, landingPageId: domains.landingPageId }).from(domains);
  const byLandingPage = new Map<number, number[]>();
  for (const row of allDomains) {
    const list = byLandingPage.get(row.landingPageId) ?? [];
    list.push(row.id);
    byLandingPage.set(row.landingPageId, list);
  }

  let split = 0;
  for (const domainIds of byLandingPage.values()) {
    if (domainIds.length <= 1) continue;
    for (let i = 1; i < domainIds.length; i++) {
      await ensureDedicatedLandingPage(db, domainIds[i]);
      split++;
    }
  }
  return { split };
}

export async function updateLandingPageFields(
  db: Db,
  landingPageId: number,
  fields: { downloadUrl?: string; pixelId?: string },
) {
  const ts = nowIso();
  const update: Record<string, string> = { updatedAt: ts };
  if (fields.downloadUrl !== undefined) update.downloadUrl = fields.downloadUrl;
  if (fields.pixelId !== undefined) update.pixelId = fields.pixelId;
  const [row] = await db.update(landingPages).set(update).where(eq(landingPages.id, landingPageId)).returning();
  return row;
}

export async function applyLandingTemplate(
  db: Db,
  landingPageId: number,
  templateId: string,
  fields?: { downloadUrl?: string; pixelId?: string; useTemplateDefaults?: boolean },
) {
  if (!isLandingTemplateId(templateId)) {
    throw new Error("无效的模板");
  }

  const [existing] = await db.select().from(landingPages).where(eq(landingPages.id, landingPageId)).limit(1);
  if (!existing) throw new Error("Landing page not found");

  const template = getLandingTemplate(templateId);
  const preset = template.preset;
  const ts = nowIso();
  const downloadUrl = fields?.useTemplateDefaults
    ? preset.downloadUrl
    : (fields?.downloadUrl?.trim() ?? existing.downloadUrl);
  const pixelId = fields?.useTemplateDefaults
    ? preset.pixelId
    : (fields?.pixelId?.trim() ?? existing.pixelId);

  const [row] = await db
    .update(landingPages)
    .set({
      name: template.name,
      templateKey: template.id,
      locale: preset.locale,
      status: preset.status,
      pageTitle: preset.pageTitle,
      metaDescription: preset.metaDescription,
      brandName: preset.brandName,
      brandSubtitle: preset.brandSubtitle,
      logoUrl: preset.logoUrl,
      bannerUrl: preset.bannerUrl,
      rewardText: preset.rewardText,
      downloadUrl,
      pixelId,
      leadStorageKey: preset.leadStorageKey,
      heroTag: preset.heroTag,
      heroTitle: preset.heroTitle,
      heroDescription: preset.heroDescription,
      heroCtaText: preset.heroCtaText,
      securityBadgeText: preset.securityBadgeText,
      dramasSectionTitle: preset.dramasSectionTitle,
      dramasSectionSubtitle: preset.dramasSectionSubtitle,
      dramasJson: JSON.stringify(preset.dramas),
      installGuideTitle: preset.installGuideTitle,
      installGuideSubtitle: preset.installGuideSubtitle,
      installStepsJson: JSON.stringify(preset.installSteps),
      finalTitle: preset.finalTitle,
      finalDescription: preset.finalDescription,
      finalCtaText: preset.finalCtaText,
      footerText: preset.footerText,
      modalTitlePrefix: preset.modalTitlePrefix,
      modalDescription: preset.modalDescription,
      modalCtaText: preset.modalCtaText,
      modalCancelText: preset.modalCancelText,
      updatedAt: ts,
    })
    .where(eq(landingPages.id, landingPageId))
    .returning();
  return row;
}

export { listLandingTemplateOptions, getLandingTemplate, isLandingTemplateId };
