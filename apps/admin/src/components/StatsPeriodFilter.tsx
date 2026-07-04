import type { StatsPeriod } from "../lib/date-range";
import { PERIOD_LABELS, rangeForPeriod } from "../lib/date-range";

interface Props {
  period: StatsPeriod | null;
  from: string;
  to: string;
  onPeriodChange: (period: StatsPeriod) => void;
  onCustomChange: (from: string, to: string) => void;
}

export default function StatsPeriodFilter({ period, from, to, onPeriodChange, onCustomChange }: Props) {
  const periods: StatsPeriod[] = ["today", "week", "month"];

  return (
    <div className="filters">
      <div className="period-tabs">
        {periods.map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn-secondary ${period === key ? "period-active" : ""}`}
            onClick={() => onPeriodChange(key)}
          >
            {PERIOD_LABELS[key]}
          </button>
        ))}
      </div>
      <input type="date" value={from} onChange={(e) => onCustomChange(e.target.value, to)} />
      <span className="muted">至</span>
      <input type="date" value={to} onChange={(e) => onCustomChange(from, e.target.value)} />
    </div>
  );
}

export { rangeForPeriod };
