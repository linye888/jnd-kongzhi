import { Hono } from "hono";
import type { StatsGroupBy } from "@lp-admin/shared";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { getDomainStats, getOverviewStats } from "../../lib/stats";
import { getStatsStorageSummary, previewStatsPurge, purgeHistoricalStats, type StatsPurgeInput } from "../../lib/stats-purge";
import { jsonResponse, errorResponse } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

function getRange(c: { req: { query: (k: string) => string | undefined } }) {
  const to = c.req.query("to") ?? new Date().toISOString().slice(0, 10);
  const from = c.req.query("from") ?? new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  return { from, to };
}

app.get("/storage", async (c) => jsonResponse(await getStatsStorageSummary(c.env)));

app.post("/purge/preview", async (c) => {
  try {
    const body = await c.req.json<StatsPurgeInput>();
    return jsonResponse(await previewStatsPurge(c.env, body));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "预览失败", 400);
  }
});

app.post("/purge", async (c) => {
  try {
    const body = await c.req.json<StatsPurgeInput>();
    return jsonResponse(await purgeHistoricalStats(c.env, body));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "删除失败", 400);
  }
});

app.get("/overview", async (c) => {
  const { from, to } = getRange(c);
  const groupBy = (c.req.query("groupBy") ?? "domain") as StatsGroupBy;
  const customerId = c.req.query("customerId");
  const productId = c.req.query("productId");
  const data = await getOverviewStats(c.env, from, to, groupBy, {
    customerId: customerId ? Number(customerId) : undefined,
    productId: productId ? Number(productId) : undefined,
  });
  return jsonResponse({ from, to, groupBy, ...data });
});

app.get("/domains/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { from, to } = getRange(c);
  const data = await getDomainStats(c.env, id, from, to);
  return jsonResponse({ domainId: id, from, to, ...data });
});

export default app;
