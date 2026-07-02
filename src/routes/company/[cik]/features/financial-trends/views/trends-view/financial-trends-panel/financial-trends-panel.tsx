"use client";

import { useMemo, useState } from "react";
import type { MetricChartRow } from "./lib/build-metric-chart-geometry";
import type { FinancialTrendsPanelProps } from "@/routes/company/[cik]/features/financial-trends/types";
import { AnomaliesTimeline, ContractStatus } from "./components/contract-status";
import { MetricDataTable } from "./components/metric-data-table";
import { filterChartPoints, MetricLineChart } from "./components/metric-line-chart";
import { DEFAULT_METRIC, METRIC_GROUPS } from "./constants";
import { buildMetricChartData } from "./lib/build-metric-chart-geometry";
import { formatMetricValue } from "./utils/format-metric";
import { humanizeConcept } from "@/routes/company/[cik]/features/financial-trends/utils/humanize-concept";

type FrequencyFilter = "quarterly" | "annual" | "both";

function metricLabel(metric: string): string {
  return metric.includes("_") ? metric.replace(/_/g, " ") : humanizeConcept(metric);
}

function availableMetrics(chart: FinancialTrendsPanelProps["data"]["chart"]): string[] {
  const fromGroups = METRIC_GROUPS.flatMap((g) => g.metrics);
  return fromGroups.filter((m) => (chart[m]?.length ?? 0) > 0);
}

export function FinancialTrendsPanel({ data }: FinancialTrendsPanelProps) {
  const metrics = useMemo(() => availableMetrics(data.chart), [data.chart]);
  const [selectedMetric, setSelectedMetric] = useState(
    metrics.includes(DEFAULT_METRIC) ? DEFAULT_METRIC : metrics[0] ?? DEFAULT_METRIC,
  );
  const [frequency, setFrequency] = useState<FrequencyFilter>("quarterly");
  const [activePoint, setActivePoint] = useState<MetricChartRow | null>(null);

  const filteredPoints = useMemo(
    () => filterChartPoints(data.chart[selectedMetric], frequency),
    [data.chart, selectedMetric, frequency],
  );

  const chartData = useMemo(() => buildMetricChartData(filteredPoints), [filteredPoints]);

  const displayPoint = activePoint ?? chartData[chartData.length - 1];
  const reportedCount = data.seriesSummary.filter((s) => s.status === "reported").length;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Financial trends</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Quarter-over-quarter and year-over-year time series from SEC company facts — every
              whitelisted metric with deltas, ratios, and anomaly flags.
            </p>
          </div>
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Coverage</p>
            <p className="mt-1 font-medium text-zinc-900">
              {reportedCount} of {data.seriesSummary.length} metrics reported
            </p>
            {data.notReported.length > 0 ? (
              <p className="mt-0.5 text-xs text-zinc-400">
                {data.notReported.length} not in filing history
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <ContractStatus contract={data.contract} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Metric</span>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="mt-1 block w-full min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {METRIC_GROUPS.map((group) => {
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

        <MetricLineChart
          metric={selectedMetric}
          chartData={chartData}
          onActivePointChange={setActivePoint}
        />

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Data table</h3>
          <div className="mt-3">
            <MetricDataTable metric={selectedMetric} points={filteredPoints} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Anomalies on timeline</h3>
          <div className="mt-3">
            <AnomaliesTimeline anomalies={data.anomalies} metric={selectedMetric} />
          </div>
        </div>

        <details className="rounded-xl border border-zinc-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-900">
            All metrics coverage ({data.seriesSummary.length})
          </summary>
          <div className="overflow-x-auto border-t border-zinc-100">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Metric</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Annual</th>
                  <th className="px-4 py-2 font-medium">Quarterly</th>
                  <th className="px-4 py-2 font-medium">Gaps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.seriesSummary.map((row) => (
                  <tr key={row.concept}>
                    <td className="px-4 py-2 text-zinc-900">{row.label}</td>
                    <td className="px-4 py-2 capitalize text-zinc-600">{row.status.replace("_", " ")}</td>
                    <td className="px-4 py-2 font-mono text-zinc-700">{row.annualCount}</td>
                    <td className="px-4 py-2 font-mono text-zinc-700">{row.quarterlyCount}</td>
                    <td className="px-4 py-2 font-mono text-zinc-700">{row.gapCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
