export type StatsPeriod = "today" | "week" | "month";

const PERIOD_DAYS: Record<StatsPeriod, number> = {
  today: 1,
  week: 7,
  month: 30,
};

export const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "今日",
  week: "近7天",
  month: "近30天",
};

export function rangeForPeriod(period: StatsPeriod) {
  const days = PERIOD_DAYS[period];
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { from, to, label: PERIOD_LABELS[period] };
}

export function detectPeriod(from: string, to: string): StatsPeriod | null {
  for (const period of Object.keys(PERIOD_DAYS) as StatsPeriod[]) {
    const range = rangeForPeriod(period);
    if (range.from === from && range.to === to) return period;
  }
  return null;
}
