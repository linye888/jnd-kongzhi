import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, loadDotEnv } from "./config.js";
import { runMigrations } from "./db.js";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(resolve(serverRoot, ".env"));

const config = loadConfig();
runMigrations(config.dbPath);
console.log(`[migrate] database ready at ${config.dbPath}`);
