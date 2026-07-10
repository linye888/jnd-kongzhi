import type { Env } from "./env";
import { createApp } from "./app";

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const { refreshTodayAggregates } = await import("./lib/stats");
    ctx.waitUntil(refreshTodayAggregates(env));
  },
};
