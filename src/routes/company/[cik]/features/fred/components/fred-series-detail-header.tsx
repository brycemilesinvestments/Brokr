import type { FredCategory } from "@/lib/fred/constants";
import type { FredSeriesRow } from "@/lib/fred/types";
import { formatFredValue } from "@/lib/fred";
import {
  FRED_ANALYTICS_CATEGORY_STYLES,
  FRED_ANALYTICS_FALLBACK_STYLE,
} from "../constants";
import type { FredRangeStats } from "../lib/compute-fred-range-stats";
import { formatFredLatestDate, formatFredRangeChange } from "../utils/format-fred-range-stats";

type FredSeriesDetailHeaderProps = {
  series: FredSeriesRow;
  stats: FredRangeStats;
};

export function FredSeriesDetailHeader({ series, stats }: FredSeriesDetailHeaderProps) {
  const categoryStyle =
    FRED_ANALYTICS_CATEGORY_STYLES[series.category as FredCategory] ??
    FRED_ANALYTICS_FALLBACK_STYLE;
  const changeIsPositive = stats.rangeChange >= 0;

  return (
    <div className="shrink-0 border-b border-zinc-100 bg-white px-6 py-[18px] pb-[15px]">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${categoryStyle.badge}`}
        >
          {series.series_id}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: categoryStyle.color }}>
          {categoryStyle.label}
        </span>
        <span className="size-[3px] rounded-full bg-zinc-300" aria-hidden />
        <span className="text-[11px] text-zinc-400">
          {series.frequency ?? "—"} · Federal Reserve Economic Data
        </span>
      </div>

      <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-zinc-900">
        {series.name}
      </h3>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div className="font-mono text-[31px] font-bold leading-none tracking-[-0.02em] text-zinc-900">
          {formatFredValue(stats.latestValue, series.units)}
        </div>

        <div className="flex items-center gap-1.5 pb-1">
          <span
            className={`font-mono text-[13px] font-bold ${
              changeIsPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {changeIsPositive ? "▲" : "▼"}{" "}
            {formatFredRangeChange(stats.rangeChange, series.units)}
          </span>
          <span className="text-[11px] text-zinc-400">over range</span>
        </div>

        <div className="ml-auto flex gap-[22px] pb-0.5">
          <Stat label="Range high" value={formatFredValue(stats.rangeHigh, series.units)} />
          <Stat label="Range low" value={formatFredValue(stats.rangeLow, series.units)} />
          <Stat label="Latest" value={formatFredLatestDate(stats.latestDate)} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[13px] font-semibold text-zinc-700">{value}</div>
    </div>
  );
}
