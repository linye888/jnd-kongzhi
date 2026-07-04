import { customers, domains, landingPages, products, users } from "@lp-admin/db";
import { DEFAULT_EN_LANDING, DEFAULT_MX_LANDING } from "@lp-admin/templates";
import type { Env } from "../env";
import { hashPassword } from "./auth";
import { getDb, nowIso } from "./utils";

export async function runSeed(env: Env) {
  const db = getDb(env);
  const ts = nowIso();

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    await db.insert(users).values({
      email: env.ADMIN_DEFAULT_EMAIL ?? "admin@example.com",
      name: "Admin",
      passwordHash: await hashPassword(env.ADMIN_DEFAULT_PASSWORD ?? "admin123456"),
      role: "admin",
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const existingCustomers = await db.select().from(customers).limit(1);
  if (existingCustomers.length > 0) {
    return { message: "Seed already applied" };
  }

  const [customerA] = await db.insert(customers).values({ name: "Customer A", notes: "India market", createdAt: ts, updatedAt: ts }).returning();
  const [customerB] = await db.insert(customers).values({ name: "Customer B", notes: "Mexico market", createdAt: ts, updatedAt: ts }).returning();
  const [productA] = await db.insert(products).values({ customerId: customerA.id, name: "Mini Short India", createdAt: ts, updatedAt: ts }).returning();
  const [productB] = await db.insert(products).values({ customerId: customerB.id, name: "Mini Short Mexico", createdAt: ts, updatedAt: ts }).returning();

  const en = DEFAULT_EN_LANDING;
  const mx = DEFAULT_MX_LANDING;

  const insertLanding = async (data: typeof en, customerId: number, productId: number) => {
    const [row] = await db
      .insert(landingPages)
      .values({
        name: data.name,
        customerId,
        productId,
        locale: data.locale,
        status: data.status,
        pageTitle: data.pageTitle,
        metaDescription: data.metaDescription,
        brandName: data.brandName,
        brandSubtitle: data.brandSubtitle,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        rewardText: data.rewardText,
        downloadUrl: data.downloadUrl,
        pixelId: data.pixelId,
        leadStorageKey: data.leadStorageKey,
        heroTag: data.heroTag,
        heroTitle: data.heroTitle,
        heroDescription: data.heroDescription,
        heroCtaText: data.heroCtaText,
        securityBadgeText: data.securityBadgeText,
        dramasSectionTitle: data.dramasSectionTitle,
        dramasSectionSubtitle: data.dramasSectionSubtitle,
        dramasJson: JSON.stringify(data.dramas),
        installGuideTitle: data.installGuideTitle,
        installGuideSubtitle: data.installGuideSubtitle,
        installStepsJson: JSON.stringify(data.installSteps),
        finalTitle: data.finalTitle,
        finalDescription: data.finalDescription,
        finalCtaText: data.finalCtaText,
        footerText: data.footerText,
        modalTitlePrefix: data.modalTitlePrefix,
        modalDescription: data.modalDescription,
        modalCtaText: data.modalCtaText,
        modalCancelText: data.modalCancelText,
        createdAt: ts,
        updatedAt: ts,
      })
      .returning();
    return row;
  };

  const lpEn = await insertLanding(en, customerA.id, productA.id);
  const lpMx = await insertLanding(mx, customerB.id, productB.id);

  await db.insert(domains).values([
    {
      hostname: "localhost",
      customerId: customerA.id,
      productId: productA.id,
      landingPageId: lpEn.id,
      status: "active",
      sslStatus: "active",
      cfCustomHostnameId: null,
      cnameTarget: env.CNAME_TARGET,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      hostname: "demo-mx.local",
      customerId: customerB.id,
      productId: productB.id,
      landingPageId: lpMx.id,
      status: "active",
      sslStatus: "active",
      cfCustomHostnameId: null,
      cnameTarget: env.CNAME_TARGET,
      createdAt: ts,
      updatedAt: ts,
    },
  ]);

  return {
    message: "Seed completed",
    admin: {
      email: env.ADMIN_DEFAULT_EMAIL ?? "admin@example.com",
      password: env.ADMIN_DEFAULT_PASSWORD ?? "admin123456",
    },
    domains: ["localhost", "demo-mx.local"],
  };
}
