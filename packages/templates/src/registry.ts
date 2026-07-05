import { DEFAULT_EN_LANDING, DEFAULT_MX_LANDING } from "./defaults.js";
import type { LandingPageConfig } from "@lp-admin/shared";

export type LandingTemplateId = "india-en" | "mexico-es";

type LandingPreset = Omit<LandingPageConfig, "id" | "customerId" | "productId" | "createdAt" | "updatedAt">;

interface LandingTemplateDefinition {
  id: LandingTemplateId;
  name: string;
  description: string;
  facebookAdHeadline: string;
  facebookAdPrimaryText: string;
  facebookAdDescription: string;
  preset: LandingPreset;
}

export const LANDING_TEMPLATES: LandingTemplateDefinition[] = [
  {
    id: "india-en",
    name: "Mini Short - 印度英语",
    description: "英语界面 · ₹3,000 奖励文案",
    facebookAdHeadline: "Watch Free Short Dramas — Get ₹3,000 Reward",
    facebookAdPrimaryText: `Bored? Mini Short brings you addictive mini dramas you can binge in minutes 🔥

✅ 100% Free to watch
✅ New episodes every day
✅ Download now & claim your ₹3,000 cash reward

No subscription. No waiting. Just tap, watch & enjoy.
👇 Download free today — limited reward slots!`,
    facebookAdDescription: "Free short dramas + ₹3,000 bonus for new users",
    preset: DEFAULT_EN_LANDING,
  },
  {
    id: "mexico-es",
    name: "Mini Short - 墨西哥西语",
    description: "西班牙语界面 · $688 MXN 奖励文案",
    facebookAdHeadline: "Novelas Cortas Gratis — Gana $688 MXN",
    facebookAdPrimaryText: `¿Aburrido? Mini Short te trae mini novelas adictivas que ves en minutos 🔥

✅ 100% gratis
✅ Episodios nuevos todos los días
✅ Descarga ahora y reclama $688 MXN de premio

Sin suscripción. Sin esperas. Solo toca, mira y disfruta.
👇 ¡Descarga gratis hoy — cupos limitados!`,
    facebookAdDescription: "Novelas cortas gratis + $688 MXN para nuevos usuarios",
    preset: DEFAULT_MX_LANDING,
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
    facebookAdHeadline: item.facebookAdHeadline,
    facebookAdPrimaryText: item.facebookAdPrimaryText,
    facebookAdDescription: item.facebookAdDescription,
  }));
}

export function getLandingTemplate(id: string | undefined): LandingTemplateDefinition {
  return LANDING_TEMPLATES.find((item) => item.id === id) ?? LANDING_TEMPLATES[0];
}

export function isLandingTemplateId(id: string): id is LandingTemplateId {
  return LANDING_TEMPLATES.some((item) => item.id === id);
}
