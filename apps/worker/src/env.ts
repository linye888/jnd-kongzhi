import type { D1Database, KVNamespace, R2Bucket, Fetcher } from "@cloudflare/workers-types";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@lp-admin/db";

export type AppDatabase = DrizzleD1Database<typeof schema> | BetterSQLite3Database<typeof schema>;

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  CNAME_TARGET: string;
  FALLBACK_ORIGIN?: string;
  PLATFORM_ZONE?: string;
  DEPLOY_TARGET?: "cloudflare" | "self-hosted";
  SERVER_IP?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  CF_ZONE_ID?: string;
  ADMIN_PAGES_TARGET?: string;
  ADMIN_DEFAULT_EMAIL?: string;
  ADMIN_DEFAULT_PASSWORD?: string;
  /** Node.js 自托管运行时注入的 Drizzle 实例 */
  _db?: AppDatabase;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
