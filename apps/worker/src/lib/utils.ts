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

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(userAgent);
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
