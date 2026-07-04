import { getLandingTemplate, isLandingTemplateId, listLandingTemplateOptions } from "@lp-admin/templates";
import { eq } from "drizzle-orm";
import { customers, landingPages, products } from "@lp-admin/db";
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

export { listLandingTemplateOptions, getLandingTemplate, isLandingTemplateId };
