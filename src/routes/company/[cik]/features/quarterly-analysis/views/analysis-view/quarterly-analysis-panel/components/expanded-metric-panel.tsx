"use client";

import { useMemo, useState } from "react";
import type { ChartBundle } from "@/lib/analysis";
import { MetricLineChart } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/components/metric-line-chart";
import { buildMetricChartData } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";
import type { MetricChartRow } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";
import { filterChartPoints } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/filter-chart-points";
import { formatMetricValue } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";
import { metricLabel } from "../lib/metric-label";

type ExpandedMetricPanelProps = {
  metric: string;
  chart: ChartBundle;
  onClose: () => void;
};

type FrequencyFilter = "quarterly" | "annual" | "both";

export function ExpandedMetricPanel({ metric, chart, onClose }: ExpandedMetricPanelProps) {
  const [frequency, setFrequency] = useState<FrequencyFilter>("quarterly");
  const [activePoint, setActivePoint] = useState<MetricChartRow | null>(null);

  const filteredPoints = useMemo(
    () => filterChartPoints(chart[metric], frequency),
    [chart, metric, frequency],
  );
  const chartData = useMemo(() => buildMetricChartData(filteredPoints), [filteredPoints]);
  const displayPoint = activePoint ?? chartData[chartData.length - 1] ?? null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            Expanded series
          </p>
          <h4 className="mt-1 text-base font-semibold text-zinc-900">{metricLabel(metric)}</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          Close
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Frequency</span>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as FrequencyFilter)}
            className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="both">Both</option>
          </select>
        </label>

        {displayPoint ? (
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Latest</p>
            <p className="mt-1 font-mono text-xl font-semibold text-zinc-900">
              {formatMetricValue(metric, displayPoint.value)}
            </p>
            <p className="mt-0.5 text-zinc-500">
              {displayPoint.date} · {displayPoint.frequency}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-white/80 bg-white p-2">
        <MetricLineChart
          metric={metric}
          chartData={chartData}
          onActivePointChange={setActivePoint}
        />
      </div>
    </div>
  );
}
