import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function isIp(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

export interface ServerConfig {
  port: number;
  host: string;
  jwtSecret: string;
  dbPath: string;
  assetsDir: string;
  adminDir: string;
  cnameTarget: string;
  fallbackOrigin: string;
  platformZone: string;
  deployTarget: "cloudflare" | "self-hosted";
  serverIp?: string;
  adminDefaultEmail: string;
  adminDefaultPassword: string;
  cfAccountId?: string;
  cfApiToken?: string;
  cfZoneId?: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function loadConfig(): ServerConfig {
  const platformZone = process.env.PLATFORM_ZONE ?? "example.com";
  const serverIp = process.env.SERVER_IP ?? (isIp(platformZone) ? platformZone : undefined);
  const deployTarget =
    process.env.DEPLOY_TARGET === "cloudflare" || process.env.DEPLOY_TARGET === "self-hosted"
      ? process.env.DEPLOY_TARGET
      : "self-hosted";

  return {
    port: Number(process.env.PORT ?? "3000"),
    host: process.env.HOST ?? "127.0.0.1",
    jwtSecret: required("JWT_SECRET", process.env.JWT_SECRET),
    dbPath: process.env.DB_PATH ?? resolve(process.cwd(), "data", "lp-admin.db"),
    assetsDir: process.env.ASSETS_DIR ?? resolve(process.cwd(), "legacy", "assets"),
    adminDir: process.env.ADMIN_DIR ?? resolve(process.cwd(), "admin"),
    cnameTarget: process.env.CNAME_TARGET ?? (serverIp ?? `customers.${platformZone}`),
    fallbackOrigin: process.env.FALLBACK_ORIGIN ?? (serverIp ?? `origin.${platformZone}`),
    platformZone,
    deployTarget,
    serverIp,
    adminDefaultEmail: process.env.ADMIN_DEFAULT_EMAIL ?? "admin@example.com",
    adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD ?? "admin123456",
    cfAccountId: process.env.CF_ACCOUNT_ID,
    cfApiToken: process.env.CF_API_TOKEN,
    cfZoneId: process.env.CF_ZONE_ID,
  };
}

export function loadDotEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
