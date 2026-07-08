import { DEFAULT_CO_LANDING, DEFAULT_EN_LANDING, DEFAULT_MX_LANDING } from "./defaults.js";
import type { LandingPageConfig } from "@lp-admin/shared";

export type LandingTemplateId = "india-en" | "mexico-es" | "colombia-es";

type LandingPreset = Omit<LandingPageConfig, "id" | "customerId" | "productId" | "createdAt" | "updatedAt">;

interface LandingTemplateDefinition {
  id: LandingTemplateId;
  name: string;
  description: string;
  preset: LandingPreset;
}

export const LANDING_TEMPLATES: LandingTemplateDefinition[] = [
  {
    id: "india-en",
    name: "Mini Short - 印度英语",
    description: "英语界面 · ₹3,000 奖励文案",
    preset: DEFAULT_EN_LANDING,
  },
  {
    id: "mexico-es",
    name: "Mini Short - 墨西哥西语",
    description: "西班牙语界面 · $688 MXN 奖励文案",
    preset: DEFAULT_MX_LANDING,
  },
  {
    id: "colombia-es",
    name: "Mini Short - 哥伦比亚西语",
    description: "西班牙语界面 · $120.000 COP 奖励文案",
    preset: DEFAULT_CO_LANDING,
  },
];

export function listLandingTemplateOptions() {
  return LANDING_TEMPLATES.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    locale: item.preset.locale,
    defaultDownloadUrl: item.preset.downloadUrl,
    defaultPixelId: item.preset.pixelId,
    rewardText: item.preset.rewardText,
  }));
}

export function getLandingTemplate(id: string | undefined): LandingTemplateDefinition {
  return LANDING_TEMPLATES.find((item) => item.id === id) ?? LANDING_TEMPLATES[0];
}

export function isLandingTemplateId(id: string): id is LandingTemplateId {
  return LANDING_TEMPLATES.some((item) => item.id === id);
}
