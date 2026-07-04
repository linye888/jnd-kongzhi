import { customers, landingPages, products } from "@lp-admin/db";
import { DEFAULT_EN_LANDING } from "@lp-admin/templates";
import { eq } from "drizzle-orm";
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
  input: { hostname: string; downloadUrl: string; pixelId: string; customerId: number; productId: number },
) {
  const template = DEFAULT_EN_LANDING;
  const ts = nowIso();
  const [row] = await db
    .insert(landingPages)
    .values({
      name: input.hostname,
      customerId: input.customerId,
      productId: input.productId,
      locale: template.locale,
      status: template.status,
      pageTitle: template.pageTitle,
      metaDescription: template.metaDescription,
      brandName: template.brandName,
      brandSubtitle: template.brandSubtitle,
      logoUrl: template.logoUrl,
      bannerUrl: template.bannerUrl,
      rewardText: template.rewardText,
      downloadUrl: input.downloadUrl,
      pixelId: input.pixelId,
      leadStorageKey: template.leadStorageKey,
      heroTag: template.heroTag,
      heroTitle: template.heroTitle,
      heroDescription: template.heroDescription,
      heroCtaText: template.heroCtaText,
      securityBadgeText: template.securityBadgeText,
      dramasSectionTitle: template.dramasSectionTitle,
      dramasSectionSubtitle: template.dramasSectionSubtitle,
      dramasJson: JSON.stringify(template.dramas),
      installGuideTitle: template.installGuideTitle,
      installGuideSubtitle: template.installGuideSubtitle,
      installStepsJson: JSON.stringify(template.installSteps),
      finalTitle: template.finalTitle,
      finalDescription: template.finalDescription,
      finalCtaText: template.finalCtaText,
      footerText: template.footerText,
      modalTitlePrefix: template.modalTitlePrefix,
      modalDescription: template.modalDescription,
      modalCtaText: template.modalCtaText,
      modalCancelText: template.modalCancelText,
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
