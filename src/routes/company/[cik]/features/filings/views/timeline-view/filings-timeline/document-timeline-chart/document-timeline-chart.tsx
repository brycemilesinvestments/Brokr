"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ReferenceLine } from "recharts";
import {
  ActiveDot,
  Dot,
  EvilLineChart,
  Grid,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/line-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/chart";
import { resolveFilingPagePath } from "@/lib/edgar/constants";
import { MARKER_COLOR } from "./constants";
import { useDocumentTimelineChart } from "./hooks/use-document-timeline-chart";
import type { DocumentTimelineChartProps } from "./types";
import { formatAxisDate, formatMarkerDate, formatPrice } from "./utils/format-price";

const chartConfig = {
  close: {
    label: "Close",
    colors: { light: ["#047857"] },
  },
} satisfies ChartConfig;

export function DocumentTimelineChart({
  cik,
  timeline,
  ticker,
  enabled,
}: DocumentTimelineChartProps) {
  const {
    eightKFilings,
    data,
    loading,
    error,
    chartData,
    markers,
    latestPrice,
    hasChartData,
  } = useDocumentTimelineChart({ cik, timeline, enabled });

  const displayTicker = data?.ticker ?? ticker;
  const showChart = Boolean(displayTicker) && (loading || hasChartData);

  const markerDates = useMemo(
    () => new Set(markers.map((marker) => marker.snappedDate)),
    [markers],
  );

  return (
    <div className="border-b border-zinc-100 px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Stock price &amp; 8-K filings</h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Daily close from Yahoo Finance
            {displayTicker ? ` (${displayTicker})` : ""} with dashed lines on each 8-K filing date.
          </p>
        </div>
        {latestPrice != null ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Latest close</p>
            <p className="mt-1 font-mono text-xl font-semibold text-zinc-900">
              ${formatPrice(latestPrice)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : !displayTicker ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Stock price chart requires a ticker symbol for this company.
          </p>
        ) : !showChart ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No daily price data available for this range.
          </p>
        ) : (
          <EvilLineChart
            data={chartData}
            config={chartConfig}
            curveType="monotone"
            animationType="left-to-right"
            isLoading={loading}
            className="h-[320px] w-full"
          >
            <Grid />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatAxisDate(String(value))}
              minTickGap={48}
            />
            <YAxis
              tickFormatter={(value) => `$${formatPrice(Number(value))}`}
              width={64}
            />
            <Tooltip />
            <Line dataKey="close">
              <Dot variant="default" />
              <ActiveDot variant="colored-border" />
            </Line>
            {markers.map((marker) => (
              <ReferenceLine
                key={marker.filing.accessionNumber ?? `${marker.filingDate}-${marker.filing.type}`}
                x={marker.snappedDate}
                stroke={MARKER_COLOR}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                label={{
                  value: `8-K · ${formatMarkerDate(marker.filingDate)}`,
                  position: "insideBottomLeft",
                  fill: MARKER_COLOR,
                  fontSize: 10,
                }}
              />
            ))}
          </EvilLineChart>
        )}
      </div>

      {eightKFilings.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No 8-K filings in the timeline — the price line will appear once 8-Ks are indexed.
        </p>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">
          {markers.length} of {eightKFilings.length} 8-K filing
          {eightKFilings.length === 1 ? "" : "s"} plotted on trading days.
          {markers.length < eightKFilings.length ? (
            <> Older filings may fall outside the loaded price range.</>
          ) : null}
        </p>
      )}

      {markers.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
          {markers.map((marker) => {
            const filingHref = resolveFilingPagePath(cik, marker.filing);
            const filedOnMarkerDay = markerDates.has(marker.filingDate);
            return (
              <li
                key={marker.filing.accessionNumber ?? `${marker.filingDate}-${marker.filing.type}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600"
              >
                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono font-semibold text-amber-800">
                  8-K
                </span>
                <span className="font-medium text-zinc-800">
                  {formatMarkerDate(marker.filingDate)}
                </span>
                {!filedOnMarkerDay ? (
                  <span className="text-zinc-400">
                    snapped to {formatMarkerDate(marker.snappedDate)}
                  </span>
                ) : null}
                <span className="text-zinc-500">${formatPrice(marker.close)}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-600">
                  {marker.filing.description}
                </span>
                {filingHref ? (
                  <Link
                    href={filingHref}
                    className="font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    View filing
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
