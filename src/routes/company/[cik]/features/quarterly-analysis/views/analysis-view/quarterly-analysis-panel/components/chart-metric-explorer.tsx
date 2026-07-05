"use client";

import { useMemo, useState } from "react";
import type { ChartBundle } from "@/lib/analysis";
import { MetricLineChart } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/components/metric-line-chart";
import { filterChartPoints } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/filter-chart-points";
import { buildMetricChartData } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";
import type { MetricChartRow } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";
import { formatMetricValue } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";
import { metricLabel } from "../lib/metric-label";

type MetricGroup = {
  label: string;
  metrics: readonly string[];
};

type ChartMetricExplorerProps = {
  title: string;
  chart: ChartBundle;
  groups: readonly MetricGroup[];
  defaultMetric?: string;
  emptyMessage?: string;
};

type FrequencyFilter = "quarterly" | "annual" | "both";

function availableMetrics(chart: ChartBundle, groups: readonly MetricGroup[]): string[] {
  const fromGroups = groups.flatMap((g) => g.metrics);
  const withData = fromGroups.filter((m) => (chart[m]?.length ?? 0) > 0);
  const segmentKeys = Object.keys(chart).filter(
    (key) =>
      (key.startsWith("end_market:") || key.startsWith("geography:")) &&
      (chart[key]?.length ?? 0) > 0,
  );
  return [...withData, ...segmentKeys];
}

export function ChartMetricExplorer({
  title,
  chart,
  groups,
  defaultMetric,
  emptyMessage = "No chart data available for this section.",
}: ChartMetricExplorerProps) {
  const metrics = useMemo(() => availableMetrics(chart, groups), [chart, groups]);
  const [selectedMetric, setSelectedMetric] = useState(
    defaultMetric && metrics.includes(defaultMetric)
      ? defaultMetric
      : metrics[0] ?? defaultMetric ?? "",
  );
  const [frequency, setFrequency] = useState<FrequencyFilter>("quarterly");
  const [activePoint, setActivePoint] = useState<MetricChartRow | null>(null);

  const filteredPoints = useMemo(
    () => filterChartPoints(chart[selectedMetric], frequency),
    [chart, selectedMetric, frequency],
  );

  const chartData = useMemo(() => buildMetricChartData(filteredPoints), [filteredPoints]);

  const displayPoint = activePoint ?? chartData[chartData.length - 1] ?? null;

  if (metrics.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  const segmentMetrics = metrics.filter(
    (m) => m.startsWith("end_market:") || m.startsWith("geography:"),
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Metric</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="mt-1 block w-full min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              {groups.map((group) => {
                const groupMetrics = group.metrics.filter((m) => metrics.includes(m));
                if (groupMetrics.length === 0) return null;
                return (
                  <optgroup key={group.label} label={group.label}>
                    {groupMetrics.map((metric) => (
                      <option key={metric} value={metric}>
                        {metricLabel(metric)}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              {segmentMetrics.length > 0 ? (
                <optgroup label="Segments">
                  {segmentMetrics.map((metric) => (
                    <option key={metric} value={metric}>
                      {metricLabel(metric)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Frequency</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FrequencyFilter)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>

        {displayPoint ? (
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Selected</p>
            <p className="mt-1 font-mono text-xl font-semibold text-zinc-900">
              {formatMetricValue(selectedMetric, displayPoint.value)}
            </p>
            <p className="mt-0.5 text-zinc-500">
              {displayPoint.date} · {displayPoint.frequency}
              {displayPoint.delta_yoy !== undefined
                ? ` · YoY ${(displayPoint.delta_yoy * 100).toFixed(1)}%`
                : ""}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <MetricLineChart
          metric={selectedMetric}
          chartData={chartData}
          onActivePointChange={setActivePoint}
        />
      </div>
    </div>
  );
}
