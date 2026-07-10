import type { LandingPageRow } from "@lp-admin/db";
import type { DramaItem, GuideStep, LandingPageConfig } from "@lp-admin/shared";
import { parseJson } from "./utils";

export function mapLandingPage(row: LandingPageRow): LandingPageConfig {
  return {
    id: row.id,
    name: row.name,
    templateKey: row.templateKey,
    customerId: row.customerId,
    productId: row.productId,
    locale: row.locale,
    status: row.status as LandingPageConfig["status"],
    pageTitle: row.pageTitle,
    metaDescription: row.metaDescription,
    brandName: row.brandName,
    brandSubtitle: row.brandSubtitle,
    logoUrl: row.logoUrl,
    bannerUrl: row.bannerUrl,
    rewardText: row.rewardText,
    downloadUrl: row.downloadUrl,
    pixelId: row.pixelId,
    leadStorageKey: row.leadStorageKey,
    heroTag: row.heroTag,
    heroTitle: row.heroTitle,
    heroDescription: row.heroDescription,
    heroCtaText: row.heroCtaText,
    securityBadgeText: row.securityBadgeText,
    dramasSectionTitle: row.dramasSectionTitle,
    dramasSectionSubtitle: row.dramasSectionSubtitle,
    dramas: parseJson<DramaItem[]>(row.dramasJson, []),
    installGuideTitle: row.installGuideTitle,
    installGuideSubtitle: row.installGuideSubtitle,
    installSteps: parseJson<GuideStep[]>(row.installStepsJson, []),
    finalTitle: row.finalTitle,
    finalDescription: row.finalDescription,
    finalCtaText: row.finalCtaText,
    footerText: row.footerText,
    modalTitlePrefix: row.modalTitlePrefix,
    modalDescription: row.modalDescription,
    modalCtaText: row.modalCtaText,
    modalCancelText: row.modalCancelText,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function serializeLandingInput(input: Partial<LandingPageConfig>) {
  return {
    ...input,
    dramasJson: input.dramas ? JSON.stringify(input.dramas) : undefined,
    installStepsJson: input.installSteps ? JSON.stringify(input.installSteps) : undefined,
    dramas: undefined,
    installSteps: undefined,
  };
}
