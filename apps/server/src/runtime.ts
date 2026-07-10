import type { AppDatabase, Env } from "@lp-admin/worker/env";
import { createAssetsFetcher, createR2Stub } from "./assets.js";
import type { ServerConfig } from "./config.js";
import { InMemoryKV } from "./kv.js";

export function createRuntimeEnv(config: ServerConfig, db: AppDatabase): Env {
  const kv = new InMemoryKV();
  const stubDb = {} as Env["DB"];

  return {
    DB: stubDb,
    KV: kv as unknown as Env["KV"],
    R2: createR2Stub() as unknown as Env["R2"],
    ASSETS: createAssetsFetcher(config.assetsDir) as unknown as Env["ASSETS"],
    JWT_SECRET: config.jwtSecret,
    CNAME_TARGET: config.cnameTarget,
    FALLBACK_ORIGIN: config.fallbackOrigin,
    PLATFORM_ZONE: config.platformZone,
    CF_ACCOUNT_ID: config.cfAccountId,
    CF_API_TOKEN: config.cfApiToken,
    CF_ZONE_ID: config.cfZoneId,
    ADMIN_DEFAULT_EMAIL: config.adminDefaultEmail,
    ADMIN_DEFAULT_PASSWORD: config.adminDefaultPassword,
    _db: db,
  };
}
