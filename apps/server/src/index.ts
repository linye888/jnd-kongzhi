import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import cron from "node-cron";
import { createApp } from "@lp-admin/worker/app";
import { loadConfig, loadDotEnv } from "./config.js";
import { createDb, runMigrations } from "./db.js";
import { createRuntimeEnv } from "./runtime.js";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(resolve(serverRoot, ".env"));

const config = loadConfig();
runMigrations(config.dbPath);

const db = createDb(config);
const env = createRuntimeEnv(config, db);

const app = createApp((hon) => {
  if (!existsSync(resolve(config.adminDir, "index.html"))) return;

  hon.get("/admin", (c) => c.redirect("/admin/"));
  hon.use(
    "/admin/*",
    serveStatic({
      root: config.adminDir,
      rewriteRequestPath: (path) => path.replace(/^\/admin/, "") || "/",
    }),
  );
});

cron.schedule("0 * * * *", async () => {
  try {
    const { refreshTodayAggregates } = await import("@lp-admin/worker/stats");
    await refreshTodayAggregates(env);
    console.log("[cron] stats refreshed");
  } catch (err) {
    console.error("[cron] stats refresh failed", err);
  }
});

serve(
  {
    fetch: (request) => app.fetch(request, env),
    port: config.port,
    hostname: config.host,
  },
  (info) => {
    console.log(`[server] listening on http://${info.address}:${info.port}`);
    console.log(`[server] platform zone: ${config.platformZone}`);
    if (existsSync(resolve(config.adminDir, "index.html"))) {
      console.log(`[server] admin UI: http://${info.address}:${info.port}/admin/`);
    }
    console.log(`[server] health: http://${info.address}:${info.port}/health`);
  },
);
