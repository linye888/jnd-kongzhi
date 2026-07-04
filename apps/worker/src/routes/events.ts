import { Hono } from "hono";
import { events } from "@lp-admin/db";
import type { Env } from "../env";
import { resolveDomain } from "../lib/domains";
import { aggregateDomainDay } from "../lib/stats";
import { getDb, isBot, nowIso, normalizeHostname } from "../lib/utils";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
  const hostname = normalizeHostname(new URL(c.req.url).hostname);
  const userAgent = c.req.header("User-Agent");
  if (isBot(userAgent ?? null)) return c.body(null, 204);

  const resolved = await resolveDomain(c.env, hostname);
  if (!resolved) return c.body(null, 404);

  let payload: { type?: string; visitor_id?: string; button_position?: string };
  try {
    payload = await c.req.json();
  } catch {
    return c.body(null, 400);
  }

  const cookieVisitor = getCookie(c.req.header("Cookie"), "ms_vid");
  const visitorId = payload.visitor_id || cookieVisitor;
  if (!visitorId) return c.body(null, 400);

  const eventType = payload.type === "download_click" ? "download_click" : payload.type === "page_view" ? "page_view" : null;
  if (!eventType) return c.body(null, 400);

  const ts = nowIso();
  const db = getDb(c.env);

  c.executionCtx.waitUntil(
    (async () => {
      await db.insert(events).values({
        domainId: resolved.domainId,
        landingPageId: resolved.landingPage.id,
        customerId: resolved.customerId,
        productId: resolved.productId,
        eventType,
        visitorId,
        buttonPosition: payload.button_position ?? null,
        country: c.req.header("CF-IPCountry") ?? null,
        referrer: c.req.header("Referer") ?? null,
        createdAt: ts,
      });
      await aggregateDomainDay(c.env, resolved.domainId, ts.slice(0, 10));
    })(),
  );

  return c.body(null, 204);
});

function getCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default app;
