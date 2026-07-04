import { and, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { domainStatsDaily, events } from "@lp-admin/db";
import type { Env } from "../env";
import { getDb } from "./utils";

export type StatsPurgeMode = "all" | "before" | "range";

export interface StatsPurgeInput {
  mode: StatsPurgeMode;
  before?: string;
  from?: string;
  to?: string;
  domainId?: number;
}

export interface StatsPurgePreview {
  eventsCount: number;
  dailyRowsCount: number;
  mode: StatsPurgeMode;
  before?: string;
  from?: string;
  to?: string;
  domainId?: number;
}

export interface StatsPurgeResult extends StatsPurgePreview {
  deletedEvents: number;
  deletedDailyRows: number;
}

function buildEventConditions(input: StatsPurgeInput, domainIds: number[] | null) {
  const parts = [];
  if (domainIds?.length) parts.push(inArray(events.domainId, domainIds));

  if (input.mode === "all") return parts.length ? and(...parts) : undefined;

  if (input.mode === "before" && input.before) {
    parts.push(lt(events.createdAt, `${input.before}T00:00:00.000Z`));
    return and(...parts);
  }

  if (input.mode === "range" && input.from && input.to) {
    parts.push(gte(events.createdAt, `${input.from}T00:00:00.000Z`));
    parts.push(lte(events.createdAt, `${input.to}T23:59:59.999Z`));
    return and(...parts);
  }

  throw new Error("无效的删除参数");
}

function buildDailyConditions(input: StatsPurgeInput, domainIds: number[] | null) {
  const parts = [];
  if (domainIds?.length) parts.push(inArray(domainStatsDaily.domainId, domainIds));

  if (input.mode === "all") return parts.length ? and(...parts) : undefined;

  if (input.mode === "before" && input.before) {
    parts.push(lt(domainStatsDaily.statDate, input.before));
    return and(...parts);
  }

  if (input.mode === "range" && input.from && input.to) {
    parts.push(gte(domainStatsDaily.statDate, input.from));
    parts.push(lte(domainStatsDaily.statDate, input.to));
    return and(...parts);
  }

  throw new Error("无效的删除参数");
}

async function resolveDomainIds(db: ReturnType<typeof getDb>, domainId?: number) {
  if (domainId) return [domainId];
  return null;
}

export function validatePurgeInput(input: StatsPurgeInput) {
  if (!input.mode || !["all", "before", "range"].includes(input.mode)) {
    throw new Error("mode 必须是 all / before / range");
  }
  if (input.mode === "before" && !input.before) throw new Error("请提供 before 日期");
  if (input.mode === "range" && (!input.from || !input.to)) throw new Error("请提供 from 和 to 日期");
  if (input.mode === "range" && input.from! > input.to!) throw new Error("开始日期不能晚于结束日期");
}

export async function previewStatsPurge(env: Env, input: StatsPurgeInput): Promise<StatsPurgePreview> {
  validatePurgeInput(input);
  const db = getDb(env);
  const domainIds = await resolveDomainIds(db, input.domainId);
  const eventWhere = buildEventConditions(input, domainIds);
  const dailyWhere = buildDailyConditions(input, domainIds);

  const eventQuery = db.select({ count: sql<number>`count(*)` }).from(events);
  const dailyQuery = db.select({ count: sql<number>`count(*)` }).from(domainStatsDaily);
  const [eventRow] = eventWhere ? await eventQuery.where(eventWhere) : await eventQuery;
  const [dailyRow] = dailyWhere ? await dailyQuery.where(dailyWhere) : await dailyQuery;

  return {
    mode: input.mode,
    before: input.before,
    from: input.from,
    to: input.to,
    domainId: input.domainId,
    eventsCount: Number(eventRow?.count ?? 0),
    dailyRowsCount: Number(dailyRow?.count ?? 0),
  };
}

export async function purgeHistoricalStats(env: Env, input: StatsPurgeInput): Promise<StatsPurgeResult> {
  const preview = await previewStatsPurge(env, input);
  const db = getDb(env);
  const domainIds = await resolveDomainIds(db, input.domainId);
  const eventWhere = buildEventConditions(input, domainIds);
  const dailyWhere = buildDailyConditions(input, domainIds);

  if (eventWhere) await db.delete(events).where(eventWhere);
  else await db.delete(events);
  if (dailyWhere) await db.delete(domainStatsDaily).where(dailyWhere);
  else await db.delete(domainStatsDaily);

  return {
    ...preview,
    deletedEvents: preview.eventsCount,
    deletedDailyRows: preview.dailyRowsCount,
  };
}

export async function getStatsStorageSummary(env: Env) {
  const db = getDb(env);
  const [eventsRow] = await db.select({ count: sql<number>`count(*)` }).from(events);
  const [dailyRow] = await db.select({ count: sql<number>`count(*)` }).from(domainStatsDaily);
  const [oldestEvent] = await db
    .select({ createdAt: events.createdAt })
    .from(events)
    .orderBy(events.createdAt)
    .limit(1);
  const [newestEvent] = await db
    .select({ createdAt: events.createdAt })
    .from(events)
    .orderBy(desc(events.createdAt))
    .limit(1);

  return {
    totalEvents: Number(eventsRow?.count ?? 0),
    totalDailyRows: Number(dailyRow?.count ?? 0),
    oldestEventAt: oldestEvent?.createdAt ?? null,
    newestEventAt: newestEvent?.createdAt ?? null,
  };
}
