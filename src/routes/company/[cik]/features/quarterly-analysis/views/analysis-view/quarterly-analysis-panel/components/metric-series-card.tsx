"use client";

import type { ChartBundle } from "@/lib/analysis";
import type { MetricPolarityMap } from "@/lib/metrics/polarity/types";
import type { AnomalyExplanation, CrossLayerAnomaly } from "@/lib/orchestrate";
import {
  deltaToneForMetric,
  formatMetricDelta,
  formatMetricValue,
} from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";
import { cn } from "@/lib/utils";
import { latestQuarterlyPoint, sparklinePoints } from "../lib/chart-helpers";
import { crossAnomaliesForMetric } from "../lib/metric-anomalies";
import { metricLabel } from "../lib/metric-label";
import { MetricAnomalyPopover } from "./metric-anomaly-popover";
import { MetricSparkline } from "./metric-sparkline";

type MetricSeriesCardProps = {
  metric: string;
  chart: ChartBundle;
  anomalies: CrossLayerAnomaly[];
  explanations: AnomalyExplanation[];
  metricPolarities?: MetricPolarityMap;
  selected?: boolean;
  onSelect: () => void;
};

const DELTA_TONE_CLASS = {
  positive: "text-emerald-700",
  negative: "text-red-600",
  neutral: "text-zinc-400",
} as const;

export function MetricSeriesCard({
  metric,
  chart,
  anomalies,
  explanations,
  metricPolarities,
  selected = false,
  onSelect,
}: MetricSeriesCardProps) {
  const latest = latestQuarterlyPoint(chart, metric);
  const sparkline = sparklinePoints(chart, metric);
  const polarity = metricPolarities?.[metric]?.polarity;
  const delta = formatMetricDelta(metric, latest?.delta_yoy);
  const deltaTone = deltaToneForMetric(metric, latest?.delta_yoy, polarity);
  const metricAnomalies = crossAnomaliesForMetric(metric, anomalies);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative flex cursor-pointer flex-col rounded-xl border bg-white text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
        selected
          ? "border-emerald-300 ring-2 ring-emerald-100"
          : "border-zinc-200 hover:border-zinc-300",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-[15px] pt-3.5 pb-2">
        <div className="flex min-w-0 flex-[1_1_0] items-center gap-1.5">
          <span className="min-w-0 text-[12.5px] font-semibold leading-snug text-zinc-900">
            {metricLabel(metric)}
          </span>
          <span
            className="inline-flex shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <MetricAnomalyPopover anomalies={metricAnomalies} explanations={explanations} />
          </span>
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-mono text-[15px] font-bold tracking-[-0.01em] text-zinc-900">
            {latest ? formatMetricValue(metric, latest.y) : "—"}
          </span>
          {delta ? (
            <span className={cn("font-mono text-[10.5px] font-semibold", DELTA_TONE_CLASS[deltaTone])}>
              {delta}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-[15px] pb-3 pt-1">
        <MetricSparkline points={sparkline} metric={metric} polarity={polarity} interactive />
      </div>
    </div>
  );
}
