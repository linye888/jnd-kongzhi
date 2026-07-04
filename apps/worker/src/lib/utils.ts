import { drizzle } from "drizzle-orm/d1";
import type { Env } from "./env";

export function getDb(env: Env) {
  return drizzle(env.DB);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function calcRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

const KNOWN_BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headlesschrome|puppeteer|playwright|phantomjs|semrush|ahrefs|petalbot|bytespider|gptbot|claudebot|curl\/|wget\/|python-requests|go-http-client|java\/|scrapy|httpclient|libwww|postman/i;

const SUSPICIOUS_UA =
  /compatible;\s*$|^mozilla\/4\.0\s*$|Headless|Electron\/|Symfony BrowserKit/i;

export function isKnownBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return KNOWN_BOT_UA.test(userAgent);
}

export function isSuspiciousTraffic(userAgent: string | null, headers: Headers): boolean {
  if (!userAgent || userAgent.trim().length < 12) return true;
  if (SUSPICIOUS_UA.test(userAgent)) return true;

  const acceptLanguage = headers.get("Accept-Language");
  const accept = headers.get("Accept");
  const secFetchSite = headers.get("Sec-Fetch-Site");
  const secFetchMode = headers.get("Sec-Fetch-Mode");
  const referrer = headers.get("Referer");

  if (!acceptLanguage && !referrer && !secFetchSite) return true;
  if (accept === "*/*" && !acceptLanguage && !referrer) return true;
  if (secFetchMode === "navigate" && !acceptLanguage && !referrer && !secFetchSite) return true;

  return false;
}

export function classifyTraffic(request: Request): { skipRecord: boolean; isBot: boolean } {
  const userAgent = request.headers.get("User-Agent");
  if (isKnownBot(userAgent)) return { skipRecord: true, isBot: true };
  if (isSuspiciousTraffic(userAgent, request.headers)) return { skipRecord: false, isBot: true };
  return { skipRecord: false, isBot: false };
}

/** @deprecated use classifyTraffic */
export function isBot(userAgent: string | null): boolean {
  return isKnownBot(userAgent);
}

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

export const VISITOR_COOKIE = "ms_vid";
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

export function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status });
}
