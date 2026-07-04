import { and, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { customers, domainStatsDaily, domains, events, landingPages, products } from "@lp-admin/db";
import type { DomainStatsDaily, DomainStatsSummary, DownloadByPosition, StatsGroupBy, StatsGroupItem, StatsOverviewTotals } from "@lp-admin/shared";
import type { Env } from "../env";
import { calcRate, getDb, todayUtc } from "./utils";

function emptySummary(): DomainStatsSummary {
  return { pageViews: 0, uniqueVisitors: 0, downloadCount: 0, uniqueDownloaders: 0, conversionRate: 0 };
}

export async function aggregateDomainDay(env: Env, domainId: number, statDate: string) {
  const db = getDb(env);
  const start = `${statDate}T00:00:00.000Z`;
  const end = `${statDate}T23:59:59.999Z`;

  const [pv] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(eq(events.domainId, domainId), eq(events.eventType, "page_view"), gte(events.createdAt, start), lte(events.createdAt, end)));

  const [uv] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(eq(events.domainId, domainId), eq(events.eventType, "page_view"), gte(events.createdAt, start), lte(events.createdAt, end)));

  const [downloads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(eq(events.domainId, domainId), eq(events.eventType, "download_click"), gte(events.createdAt, start), lte(events.createdAt, end)));

  const [uniqueDownloads] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(eq(events.domainId, domainId), eq(events.eventType, "download_click"), gte(events.createdAt, start), lte(events.createdAt, end)));

  const pageViews = Number(pv?.count ?? 0);
  const uniqueVisitors = Number(uv?.count ?? 0);
  const downloadCount = Number(downloads?.count ?? 0);
  const uniqueDownloaders = Number(uniqueDownloads?.count ?? 0);

  await db
    .insert(domainStatsDaily)
    .values({ domainId, statDate, pageViews, uniqueVisitors, downloadCount, uniqueDownloaders })
    .onConflictDoUpdate({
      target: [domainStatsDaily.domainId, domainStatsDaily.statDate],
      set: { pageViews, uniqueVisitors, downloadCount, uniqueDownloaders },
    });
}

export async function getDomainStats(env: Env, domainId: number, from: string, to: string) {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(domainStatsDaily)
    .where(and(eq(domainStatsDaily.domainId, domainId), gte(domainStatsDaily.statDate, from), lte(domainStatsDaily.statDate, to)))
    .orderBy(domainStatsDaily.statDate);

  const summary = rows.reduce(
    (acc, row) => ({
      pageViews: acc.pageViews + row.pageViews,
      uniqueVisitors: acc.uniqueVisitors + row.uniqueVisitors,
      downloadCount: acc.downloadCount + row.downloadCount,
      uniqueDownloaders: acc.uniqueDownloaders + row.uniqueDownloaders,
      conversionRate: 0,
    }),
    emptySummary(),
  );
  summary.conversionRate = calcRate(summary.uniqueDownloaders, summary.uniqueVisitors);

  const daily: DomainStatsDaily[] = rows.map((row) => ({
    date: row.statDate,
    pageViews: row.pageViews,
    uniqueVisitors: row.uniqueVisitors,
    downloadCount: row.downloadCount,
    uniqueDownloaders: row.uniqueDownloaders,
    conversionRate: calcRate(row.uniqueDownloaders, row.uniqueVisitors),
  }));

  const start = `${from}T00:00:00.000Z`;
  const end = `${to}T23:59:59.999Z`;
  const positions = await db
    .select({ buttonPosition: events.buttonPosition, count: sql<number>`count(*)` })
    .from(events)
    .where(and(eq(events.domainId, domainId), eq(events.eventType, "download_click"), gte(events.createdAt, start), lte(events.createdAt, end)))
    .groupBy(events.buttonPosition);

  const downloadByPosition: DownloadByPosition = { hero: 0, footer: 0, drama_modal: 0 };
  for (const row of positions) {
    const key = (row.buttonPosition ?? "hero") as keyof DownloadByPosition;
    if (key in downloadByPosition) downloadByPosition[key] = Number(row.count);
  }

  return { summary, daily, downloadByPosition };
}

export async function getOverviewStats(
  env: Env,
  from: string,
  to: string,
  groupBy: StatsGroupBy,
  filters?: { customerId?: number; productId?: number },
) {
  const db = getDb(env);
  let domainQuery = db.select().from(domains);
  const allDomains = await domainQuery;
  const filteredDomains = allDomains.filter((d) => {
    if (filters?.customerId && d.customerId !== filters.customerId) return false;
    if (filters?.productId && d.productId !== filters.productId) return false;
    return true;
  });
  const domainIds = filteredDomains.map((d) => d.id);
  if (domainIds.length === 0) {
    return {
      totals: {
        ...emptySummary(),
        uniqueVisitorsSum: 0,
        uniqueVisitorsDeduped: 0,
        uniqueDownloadersSum: 0,
        uniqueDownloadersDeduped: 0,
        activeDomains: 0,
      } satisfies StatsOverviewTotals,
      items: [] as StatsGroupItem[],
    };
  }

  const statsRows = await db
    .select()
    .from(domainStatsDaily)
    .where(and(inArray(domainStatsDaily.domainId, domainIds), gte(domainStatsDaily.statDate, from), lte(domainStatsDaily.statDate, to)));

  const byDomain = new Map<number, DomainStatsSummary>();
  for (const id of domainIds) byDomain.set(id, emptySummary());
  for (const row of statsRows) {
    const current = byDomain.get(row.domainId) ?? emptySummary();
    current.pageViews += row.pageViews;
    current.uniqueVisitors += row.uniqueVisitors;
    current.downloadCount += row.downloadCount;
    current.uniqueDownloaders += row.uniqueDownloaders;
    byDomain.set(row.domainId, current);
  }

  const start = `${from}T00:00:00.000Z`;
  const end = `${to}T23:59:59.999Z`;
  const [dedupUv] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(inArray(events.domainId, domainIds), eq(events.eventType, "page_view"), gte(events.createdAt, start), lte(events.createdAt, end)));
  const [dedupDownloaders] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(inArray(events.domainId, domainIds), eq(events.eventType, "download_click"), gte(events.createdAt, start), lte(events.createdAt, end)));

  const totals = Array.from(byDomain.values()).reduce(
    (acc, item) => ({
      pageViews: acc.pageViews + item.pageViews,
      uniqueVisitors: acc.uniqueVisitors + item.uniqueVisitors,
      downloadCount: acc.downloadCount + item.downloadCount,
      uniqueDownloaders: acc.uniqueDownloaders + item.uniqueDownloaders,
      conversionRate: 0,
      uniqueVisitorsSum: acc.uniqueVisitorsSum + item.uniqueVisitors,
      uniqueDownloadersSum: acc.uniqueDownloadersSum + item.uniqueDownloaders,
      uniqueVisitorsDeduped: Number(dedupUv?.count ?? 0),
      uniqueDownloadersDeduped: Number(dedupDownloaders?.count ?? 0),
      activeDomains: acc.activeDomains,
    }),
    {
      ...emptySummary(),
      uniqueVisitorsSum: 0,
      uniqueVisitorsDeduped: 0,
      uniqueDownloadersSum: 0,
      uniqueDownloadersDeduped: 0,
      activeDomains: 0,
    } as StatsOverviewTotals,
  );
  totals.conversionRate = calcRate(totals.uniqueDownloadersSum, totals.uniqueVisitorsSum);
  totals.activeDomains = Array.from(byDomain.values()).filter((s) => s.pageViews > 0).length;

  const items = await buildGroupItems(env, filteredDomains, byDomain, groupBy);
  return { totals, items };
}

async function buildGroupItems(
  env: Env,
  domainRows: Array<typeof domains.$inferSelect>,
  byDomain: Map<number, DomainStatsSummary>,
  groupBy: StatsGroupBy,
): Promise<StatsGroupItem[]> {
  const db = getDb(env);
  const groups = new Map<string, StatsGroupItem & { domainIds: Set<number> }>();

  const customerRows = await db.select().from(customers);
  const productRows = await db.select().from(products);
  const landingRows = await db.select().from(landingPages);
  const customerName = new Map(customerRows.map((r) => [r.id, r.name]));
  const productName = new Map(productRows.map((r) => [r.id, r.name]));
  const landingName = new Map(landingRows.map((r) => [r.id, r.name]));

  for (const domain of domainRows) {
    const stats = byDomain.get(domain.id) ?? emptySummary();
    let key = "";
    let id = 0;
    let name = "";

    if (groupBy === "domain") {
      key = `domain:${domain.id}`;
      id = domain.id;
      name = domain.hostname;
    } else if (groupBy === "landing_page") {
      key = `lp:${domain.landingPageId}`;
      id = domain.landingPageId;
      name = landingName.get(domain.landingPageId) ?? `Landing #${domain.landingPageId}`;
    } else if (groupBy === "customer") {
      key = `customer:${domain.customerId}`;
      id = domain.customerId;
      name = customerName.get(domain.customerId) ?? `Customer #${domain.customerId}`;
    } else {
      key = `product:${domain.productId}`;
      id = domain.productId;
      name = productName.get(domain.productId) ?? `Product #${domain.productId}`;
    }

    const existing = groups.get(key) ?? {
      id,
      name,
      pageViews: 0,
      uniqueVisitors: 0,
      downloadCount: 0,
      uniqueDownloaders: 0,
      conversionRate: 0,
      domainCount: 0,
      domainIds: new Set<number>(),
    };
    existing.pageViews += stats.pageViews;
    existing.uniqueVisitors += stats.uniqueVisitors;
    existing.downloadCount += stats.downloadCount;
    existing.uniqueDownloaders += stats.uniqueDownloaders;
    existing.domainIds.add(domain.id);
    existing.domainCount = existing.domainIds.size;
    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      pageViews: item.pageViews,
      uniqueVisitors: item.uniqueVisitors,
      downloadCount: item.downloadCount,
      uniqueDownloaders: item.uniqueDownloaders,
      conversionRate: calcRate(item.uniqueDownloaders, item.uniqueVisitors),
      domainCount: item.domainCount,
    }))
    .sort((a, b) => b.downloadCount - a.downloadCount);
}

export async function refreshTodayAggregates(env: Env) {
  const db = getDb(env);
  const allDomains = await db.select({ id: domains.id }).from(domains);
  const today = todayUtc();
  for (const domain of allDomains) {
    await aggregateDomainDay(env, domain.id, today);
  }
}

export async function getTodaySummaryForDomains(env: Env, domainIds: number[]) {
  const db = getDb(env);
  if (domainIds.length === 0) return new Map<number, DomainStatsSummary>();
  const today = todayUtc();
  await refreshTodayAggregates(env);
  const rows = await db.select().from(domainStatsDaily).where(and(inArray(domainStatsDaily.domainId, domainIds), eq(domainStatsDaily.statDate, today)));
  const map = new Map<number, DomainStatsSummary>();
  for (const row of rows) {
    map.set(row.domainId, {
      pageViews: row.pageViews,
      uniqueVisitors: row.uniqueVisitors,
      downloadCount: row.downloadCount,
      uniqueDownloaders: row.uniqueDownloaders,
      conversionRate: calcRate(row.uniqueDownloaders, row.uniqueVisitors),
    });
  }
  return map;
}
