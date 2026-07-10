import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSeed } from "@lp-admin/worker/seed";
import { loadConfig, loadDotEnv } from "./config.js";
import { createDb } from "./db.js";
import { createRuntimeEnv } from "./runtime.js";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(resolve(serverRoot, ".env"));

const config = loadConfig();
const db = createDb(config);
const env = createRuntimeEnv(config, db);

const result = await runSeed(env);
console.log(JSON.stringify(result, null, 2));
