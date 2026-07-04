import { renderLandingPage } from "@lp-admin/templates";
import type { Env } from "../env";
import { resolveDomain } from "../lib/domains";
import { aggregateDomainDay } from "../lib/stats";
import { events } from "@lp-admin/db";
import { getDb, isBot, nowIso, VISITOR_COOKIE, VISITOR_MAX_AGE } from "../lib/utils";

export async function handleLandingRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return null;

  if (url.pathname.startsWith("/assets/")) {
    const assetPath = url.pathname.slice("/assets".length) || "/";
    const assetRequest = new Request(new URL(assetPath, request.url), request);
    return env.ASSETS.fetch(assetRequest);
  }

  const hostname = url.hostname;
  const resolved = await resolveDomain(env, hostname);
  if (!resolved) {
    return new Response("Domain not configured", { status: 404 });
  }

  let visitorId = getCookie(request.headers.get("Cookie"), VISITOR_COOKIE);
  if (!visitorId) visitorId = crypto.randomUUID();

  const html = renderLandingPage(resolved.landingPage, visitorId);
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" });
  headers.append("Set-Cookie", `${VISITOR_COOKIE}=${visitorId}; Max-Age=${VISITOR_MAX_AGE}; Path=/; Secure; SameSite=Lax`);

  const userAgent = request.headers.get("User-Agent");
  if (!isBot(userAgent)) {
    ctx.waitUntil(
      (async () => {
        const ts = nowIso();
        const db = getDb(env);
        await db.insert(events).values({
          domainId: resolved.domainId,
          landingPageId: resolved.landingPage.id,
          customerId: resolved.customerId,
          productId: resolved.productId,
          eventType: "page_view",
          visitorId,
          buttonPosition: null,
          country: request.headers.get("CF-IPCountry"),
          referrer: request.headers.get("Referer"),
          createdAt: ts,
        });
        await aggregateDomainDay(env, resolved.domainId, ts.slice(0, 10));
      })(),
    );
  }

  return new Response(html, { headers });
}

function getCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
