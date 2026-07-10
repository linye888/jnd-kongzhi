import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@lp-admin/db";
import type { ServerConfig } from "./config.js";

const MIGRATIONS_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "../../../packages/db/migrations");

export function openDatabase(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function runMigrations(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    sqlite
      .prepare("SELECT name FROM _migrations ORDER BY id")
      .all()
      .map((row) => (row as { name: string }).name),
  );

  const files = ["0001_init.sql", "0002_event_traffic_quality.sql", "0003_landing_template_key.sql"];
  const now = new Date().toISOString();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlPath = join(MIGRATIONS_DIR, file);
    if (!existsSync(sqlPath)) throw new Error(`Migration file not found: ${sqlPath}`);
    const sql = readFileSync(sqlPath, "utf8");
    sqlite.exec(sql);
    sqlite.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, now);
    console.log(`[migrate] applied ${file}`);
  }

  sqlite.close();
}

export function createDb(config: ServerConfig) {
  return openDatabase(config.dbPath);
}
