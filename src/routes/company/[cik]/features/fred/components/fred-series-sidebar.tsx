import type { FredSeriesRow } from "@/lib/fred/types";
import { FRED_CATEGORY_STYLES } from "@/routes/company/[cik]/features/filings/views/timeline-view/filings-timeline/constants";
import type { FredCategory } from "@/lib/fred/constants";

type FredSeriesSidebarProps = {
  series: FredSeriesRow[];
  selectedSeriesId: string | null;
  onSelectSeries: (seriesId: string) => void;
};

export function FredSeriesSidebar({
  series,
  selectedSeriesId,
  onSelectSeries,
}: FredSeriesSidebarProps) {
  const grouped = series.reduce<Map<string, FredSeriesRow[]>>((acc, item) => {
    const bucket = acc.get(item.category) ?? [];
    bucket.push(item);
    acc.set(item.category, bucket);
    return acc;
  }, new Map());

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-r border-zinc-100 px-2 py-2">
      {[...grouped.entries()].map(([category, items]) => {
        const styles =
          FRED_CATEGORY_STYLES[category as FredCategory] ??
          FRED_CATEGORY_STYLES["Leading Indicators"];

        return (
          <div key={category} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {category}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const isSelected = selectedSeriesId === item.series_id;
                return (
                  <button
                    key={item.series_id}
                    type="button"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => onSelectSeries(item.series_id)}
                    className={`flex w-full flex-col gap-0.5 rounded-[9px] px-2.5 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-zinc-100 ring-1 ring-inset ring-zinc-200"
                        : "bg-transparent hover:bg-zinc-50"
                    }`}
                  >
                    <span className={`w-fit rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${styles.badge}`}>
                      {item.series_id}
                    </span>
                    <span className="text-[11.5px] leading-snug text-zinc-700">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
