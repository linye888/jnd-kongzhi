import { and, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { customers, domainStatsDaily, domains, events, landingPages, products } from "@lp-admin/db";
import type { DomainStatsDaily, DomainStatsSummary, DownloadByPosition, StatsGroupBy, StatsGroupItem, StatsOverviewTotals } from "@lp-admin/shared";
import type { Env } from "../env";
import { calcRate, getDb, todayUtc } from "./utils";

function emptySummary(): DomainStatsSummary {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    botPageViews: 0,
    botUniqueVisitors: 0,
    downloadCount: 0,
    uniqueDownloaders: 0,
    conversionRate: 0,
  };
}

function eventWindow(from: string, to: string) {
  return { start: `${from}T00:00:00.000Z`, end: `${to}T23:59:59.999Z` };
}

async function countDistinctVisitors(
  db: ReturnType<typeof getDb>,
  domainIds: number[],
  start: string,
  end: string,
  isBot: 0 | 1,
) {
  const [row] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(
      and(
        inArray(events.domainId, domainIds),
        eq(events.eventType, "page_view"),
        eq(events.isBot, isBot),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    );
  return Number(row?.count ?? 0);
}

async function countDistinctVisitorsByDomain(
  db: ReturnType<typeof getDb>,
  domainIds: number[],
  start: string,
  end: string,
  isBot: 0 | 1,
) {
  const rows = await db
    .select({ domainId: events.domainId, count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(
      and(
        inArray(events.domainId, domainIds),
        eq(events.eventType, "page_view"),
        eq(events.isBot, isBot),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    )
    .groupBy(events.domainId);

  const map = new Map<number, number>();
  for (const id of domainIds) map.set(id, 0);
  for (const row of rows) map.set(row.domainId, Number(row.count));
  return map;
}

export async function aggregateDomainDay(env: Env, domainId: number, statDate: string) {
  const db = getDb(env);
  const start = `${statDate}T00:00:00.000Z`;
  const end = `${statDate}T23:59:59.999Z`;
  const base = and(eq(events.domainId, domainId), gte(events.createdAt, start), lte(events.createdAt, end));

  const [humanPv] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(base, eq(events.eventType, "page_view"), eq(events.isBot, 0)));
  const [botPv] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(base, eq(events.eventType, "page_view"), eq(events.isBot, 1)));
  const [humanUv] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(base, eq(events.eventType, "page_view"), eq(events.isBot, 0)));
  const [botUv] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(base, eq(events.eventType, "page_view"), eq(events.isBot, 1)));
  const [downloads] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(base, eq(events.eventType, "download_click"), eq(events.isBot, 0)));
  const [uniqueDownloads] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(and(base, eq(events.eventType, "download_click"), eq(events.isBot, 0)));

  const humanPageViews = Number(humanPv?.count ?? 0);
  const botPageViews = Number(botPv?.count ?? 0);
  const humanUniqueVisitors = Number(humanUv?.count ?? 0);
  const botUniqueVisitors = Number(botUv?.count ?? 0);
  const downloadCount = Number(downloads?.count ?? 0);
  const uniqueDownloaders = Number(uniqueDownloads?.count ?? 0);

  await db
    .insert(domainStatsDaily)
    .values({
      domainId,
      statDate,
      pageViews: humanPageViews,
      uniqueVisitors: humanUniqueVisitors,
      downloadCount,
      uniqueDownloaders,
      humanPageViews,
      botPageViews,
      humanUniqueVisitors,
      botUniqueVisitors,
    })
    .onConflictDoUpdate({
      target: [domainStatsDaily.domainId, domainStatsDaily.statDate],
      set: {
        pageViews: humanPageViews,
        uniqueVisitors: humanUniqueVisitors,
        downloadCount,
        uniqueDownloaders,
        humanPageViews,
        botPageViews,
        humanUniqueVisitors,
        botUniqueVisitors,
      },
    });
}

export async function getDomainStats(env: Env, domainId: number, from: string, to: string) {
  const db = getDb(env);
  const { start, end } = eventWindow(from, to);
  const rows = await db
    .select()
    .from(domainStatsDaily)
    .where(and(eq(domainStatsDaily.domainId, domainId), gte(domainStatsDaily.statDate, from), lte(domainStatsDaily.statDate, to)))
    .orderBy(domainStatsDaily.statDate);

  const pageViews = rows.reduce((acc, row) => acc + (row.humanPageViews ?? row.pageViews), 0);
  const botPageViews = rows.reduce((acc, row) => acc + (row.botPageViews ?? 0), 0);
  const downloadCount = rows.reduce((acc, row) => acc + row.downloadCount, 0);

  const [humanUv] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(
      and(
        eq(events.domainId, domainId),
        eq(events.eventType, "page_view"),
        eq(events.isBot, 0),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    );
  const [botUv] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(
      and(
        eq(events.domainId, domainId),
        eq(events.eventType, "page_view"),
        eq(events.isBot, 1),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    );
  const [uniqueDownloadersRow] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(
      and(
        eq(events.domainId, domainId),
        eq(events.eventType, "download_click"),
        eq(events.isBot, 0),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    );

  const summary: DomainStatsSummary = {
    pageViews,
    uniqueVisitors: Number(humanUv?.count ?? 0),
    botPageViews,
    botUniqueVisitors: Number(botUv?.count ?? 0),
    downloadCount,
    uniqueDownloaders: Number(uniqueDownloadersRow?.count ?? 0),
    conversionRate: 0,
  };
  summary.conversionRate = calcRate(summary.uniqueDownloaders, summary.uniqueVisitors);

  const daily: DomainStatsDaily[] = rows.map((row) => ({
    date: row.statDate,
    pageViews: row.humanPageViews ?? row.pageViews,
    uniqueVisitors: row.humanUniqueVisitors ?? row.uniqueVisitors,
    botPageViews: row.botPageViews ?? 0,
    botUniqueVisitors: row.botUniqueVisitors ?? 0,
    downloadCount: row.downloadCount,
    uniqueDownloaders: row.uniqueDownloaders,
    conversionRate: calcRate(row.uniqueDownloaders, row.humanUniqueVisitors ?? row.uniqueVisitors),
  }));

  const positions = await db
    .select({ buttonPosition: events.buttonPosition, count: sql<number>`count(*)` })
    .from(events)
    .where(
      and(
        eq(events.domainId, domainId),
        eq(events.eventType, "download_click"),
        eq(events.isBot, 0),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    )
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
  const allDomains = await db.select().from(domains);
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
        botUniqueVisitorsDeduped: 0,
        activeDomains: 0,
      } satisfies StatsOverviewTotals,
      items: [] as StatsGroupItem[],
    };
  }

  const { start, end } = eventWindow(from, to);
  const statsRows = await db
    .select()
    .from(domainStatsDaily)
    .where(and(inArray(domainStatsDaily.domainId, domainIds), gte(domainStatsDaily.statDate, from), lte(domainStatsDaily.statDate, to)));

  const byDomain = new Map<number, DomainStatsSummary>();
  for (const id of domainIds) byDomain.set(id, emptySummary());
  for (const row of statsRows) {
    const current = byDomain.get(row.domainId) ?? emptySummary();
    current.pageViews += row.humanPageViews ?? row.pageViews;
    current.botPageViews += row.botPageViews ?? 0;
    current.downloadCount += row.downloadCount;
    current.uniqueDownloaders += row.uniqueDownloaders;
    byDomain.set(row.domainId, current);
  }

  const humanUvByDomain = await countDistinctVisitorsByDomain(db, domainIds, start, end, 0);
  const botUvByDomain = await countDistinctVisitorsByDomain(db, domainIds, start, end, 1);
  for (const id of domainIds) {
    const current = byDomain.get(id) ?? emptySummary();
    current.uniqueVisitors = humanUvByDomain.get(id) ?? 0;
    current.botUniqueVisitors = botUvByDomain.get(id) ?? 0;
    byDomain.set(id, current);
  }

  const uniqueVisitorsDeduped = await countDistinctVisitors(db, domainIds, start, end, 0);
  const botUniqueVisitorsDeduped = await countDistinctVisitors(db, domainIds, start, end, 1);

  const [dedupDownloaders] = await db
    .select({ count: sql<number>`count(distinct ${events.visitorId})` })
    .from(events)
    .where(
      and(
        inArray(events.domainId, domainIds),
        eq(events.eventType, "download_click"),
        eq(events.isBot, 0),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    );

  const domainSummaries = Array.from(byDomain.values());
  const uniqueVisitorsSum = domainSummaries.reduce((acc, item) => acc + item.uniqueVisitors, 0);
  const uniqueDownloadersSum = domainSummaries.reduce((acc, item) => acc + item.uniqueDownloaders, 0);

  const totals: StatsOverviewTotals = {
    pageViews: domainSummaries.reduce((acc, item) => acc + item.pageViews, 0),
    uniqueVisitors: uniqueVisitorsSum,
    botPageViews: domainSummaries.reduce((acc, item) => acc + item.botPageViews, 0),
    botUniqueVisitors: botUniqueVisitorsDeduped,
    downloadCount: domainSummaries.reduce((acc, item) => acc + item.downloadCount, 0),
    uniqueDownloaders: uniqueDownloadersSum,
    conversionRate: calcRate(uniqueDownloadersSum, uniqueVisitorsSum),
    uniqueVisitorsSum,
    uniqueVisitorsDeduped,
    uniqueDownloadersSum,
    uniqueDownloadersDeduped: Number(dedupDownloaders?.count ?? 0),
    botUniqueVisitorsDeduped,
    activeDomains: domainSummaries.filter((s) => s.pageViews > 0 || s.botPageViews > 0).length,
  };

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
      botPageViews: 0,
      botUniqueVisitors: 0,
      downloadCount: 0,
      uniqueDownloaders: 0,
      conversionRate: 0,
      domainCount: 0,
      domainIds: new Set<number>(),
    };
    existing.pageViews += stats.pageViews;
    existing.uniqueVisitors += stats.uniqueVisitors;
    existing.botPageViews += stats.botPageViews;
    existing.botUniqueVisitors += stats.botUniqueVisitors;
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
      botPageViews: item.botPageViews,
      botUniqueVisitors: item.botUniqueVisitors,
      downloadCount: item.downloadCount,
      uniqueDownloaders: item.uniqueDownloaders,
      conversionRate: calcRate(item.uniqueDownloaders, item.uniqueVisitors),
      domainCount: item.domainCount,
    }))
    .sort((a, b) => b.downloadCount - a.downloadCount || b.pageViews - a.pageViews);
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
  // Read pre-aggregated rows only. Events update domain_stats_daily on ingest;
  // full refresh runs on the scheduled worker cron, not on every admin list load.
  const rows = await db.select().from(domainStatsDaily).where(and(inArray(domainStatsDaily.domainId, domainIds), eq(domainStatsDaily.statDate, today)));
  const map = new Map<number, DomainStatsSummary>();
  for (const row of rows) {
    map.set(row.domainId, {
      pageViews: row.humanPageViews ?? row.pageViews,
      uniqueVisitors: row.humanUniqueVisitors ?? row.uniqueVisitors,
      botPageViews: row.botPageViews ?? 0,
      botUniqueVisitors: row.botUniqueVisitors ?? 0,
      downloadCount: row.downloadCount,
      uniqueDownloaders: row.uniqueDownloaders,
      conversionRate: calcRate(row.uniqueDownloaders, row.humanUniqueVisitors ?? row.uniqueVisitors),
    });
  }
  return map;
}
