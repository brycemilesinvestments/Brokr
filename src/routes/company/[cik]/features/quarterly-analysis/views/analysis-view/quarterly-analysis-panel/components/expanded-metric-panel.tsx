"use client";

import Link from "next/link";
import { companyTabPath } from "@/routes/company/[cik]/lib/company-tab-paths";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChartBundle } from "@/lib/analysis";
import {
  ChartTimeRangeSwitch,
  filterDatedRowsByTimeRange,
  type ChartTimeRange,
} from "@/routes/company/[cik]/components/chart-time-range-switch";
import { MetricTradingViewChart } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/components/metric-tradingview-chart";
import { buildMetricChartData } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";
import type { MetricChartRow } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";
import { filterChartPoints } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/filter-chart-points";
import { formatMetricValue } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";
import type { Filing } from "@/routes/company/[cik]/types";
import { metricLabel } from "../lib/metric-label";
import { resolveChartPointFilingHref } from "../lib/resolve-metric-filing";

type ExpandedMetricPanelProps = {
  cik: string;
  filings: Filing[];
  metric: string;
  chart: ChartBundle;
  onClose: () => void;
};

type FrequencyFilter = "quarterly" | "annual" | "both";

const FREQUENCY_OPTIONS: Array<{ value: FrequencyFilter; label: string }> = [
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "both", label: "Both" },
];

export function ExpandedMetricPanel({
  cik,
  filings,
  metric,
  chart,
  onClose,
}: ExpandedMetricPanelProps) {
  const [frequency, setFrequency] = useState<FrequencyFilter>("quarterly");
  const [timeRange, setTimeRange] = useState<ChartTimeRange>("MAX");
  const viewKey = `${metric}:${frequency}:${timeRange}`;
  const [pointState, setPointState] = useState<{
    viewKey: string;
    pinned: MetricChartRow | null;
    hover: MetricChartRow | null;
  }>({ viewKey, pinned: null, hover: null });

  const pinnedPoint = pointState.viewKey === viewKey ? pointState.pinned : null;
  const hoverPoint = pointState.viewKey === viewKey ? pointState.hover : null;

  function setPinnedPoint(point: MetricChartRow | null) {
    setPointState((current) => ({
      viewKey,
      pinned: point,
      hover: current.viewKey === viewKey ? current.hover : null,
    }));
  }

  function setHoverPoint(point: MetricChartRow | null) {
    setPointState((current) => ({
      viewKey,
      pinned: current.viewKey === viewKey ? current.pinned : null,
      hover: point,
    }));
  }

  const filteredPoints = useMemo(
    () => filterChartPoints(chart[metric], frequency),
    [chart, metric, frequency],
  );

  const rangedChartData = useMemo(() => {
    const rows = buildMetricChartData(filteredPoints);
    return filterDatedRowsByTimeRange(rows, timeRange);
  }, [filteredPoints, timeRange]);

  const displayPoint =
    pinnedPoint ?? hoverPoint ?? rangedChartData[rangedChartData.length - 1] ?? null;

  const filingHref = useMemo(() => {
    if (!displayPoint) return undefined;
    return resolveChartPointFilingHref(cik, filings, displayPoint);
  }, [cik, displayPoint, filings]);

  const pinnedDocumentHref = useMemo(() => {
    if (!pinnedPoint) return undefined;
    return resolveChartPointFilingHref(cik, filings, pinnedPoint);
  }, [cik, pinnedPoint, filings]);

  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-zinc-900">{metricLabel(metric)}</h4>
          {displayPoint ? (
            <span className="mt-1 block font-mono text-xl font-semibold text-zinc-900">
              {formatMetricValue(metric, displayPoint.value)}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {filingHref ? (
            <Link
              href={filingHref}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Documents
            </Link>
          ) : (
            <Link
              href={companyTabPath(cik, "timeline")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Documents
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg leading-none text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close expanded metric"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-100 bg-white p-2">
        <MetricTradingViewChart
          metric={metric}
          chartData={rangedChartData}
          pinnedPoint={pinnedPoint}
          onPinnedPointChange={setPinnedPoint}
          onHoverPointChange={setHoverPoint}
          documentHref={pinnedDocumentHref}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={frequency}
          onValueChange={(value) => setFrequency(value as FrequencyFilter)}
        >
          <TabsList className="h-8">
            {FREQUENCY_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3 text-xs">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ChartTimeRangeSwitch
          value={timeRange}
          onChange={setTimeRange}
          variant="segmented"
        />
      </div>
    </div>
  );
}
