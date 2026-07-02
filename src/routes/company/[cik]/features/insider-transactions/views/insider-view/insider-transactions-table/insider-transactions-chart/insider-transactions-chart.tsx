"use client";

import {
  Bar,
  EvilBarChart,
  Grid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/bar-chart";
import {
  ActiveDot as LineActiveDot,
  Dot,
  EvilLineChart,
  Grid as LineGrid,
  Legend as LineLegend,
  Line,
  Tooltip as LineTooltip,
  XAxis as LineXAxis,
  YAxis as LineYAxis,
} from "@/components/evilcharts/charts/line-chart";
import { TIME_RANGE_OPTIONS } from "./constants";
import { useInsiderTransactionsChart } from "./hooks/use-insider-transactions-chart";
import type { InsiderTransactionsChartProps } from "./types";
import { formatAxisDateForRange } from "./utils/format-dates";
import { formatShares, formatSharesFull } from "./utils/format-shares";
import { type ChartConfig } from "@/components/evilcharts/ui/chart";

const activityChartConfig = {
  buys: {
    label: "Shares acquired",
    colors: { light: ["#047857"] },
  },
  sells: {
    label: "Shares disposed",
    colors: { light: ["#dc2626"] },
  },
} satisfies ChartConfig;

export function InsiderTransactionsChart({ transactions }: InsiderTransactionsChartProps) {
  const {
    owners,
    chartMode,
    setChartMode,
    timeRange,
    setTimeRange,
    selectedOwners,
    effectiveSelectedOwners,
    holdingsSecurity,
    activityData,
    holdingsData,
    holdingsSeries,
    holdingsConfig,
    totalBuys,
    totalSells,
    toggleOwner,
    hasChartData,
  } = useInsiderTransactionsChart(transactions);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-zinc-100 px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Transaction chart</h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            {chartMode === "activity"
              ? "Monthly share volume from Form 4 filings — green for acquisitions (A), red for dispositions (D)."
              : "Each line tracks shares owned after each reported transaction. “Shares owned after” is the insider’s total holding in that security immediately following the trade."}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Acquired{timeRange !== "MAX" ? ` (${timeRange})` : ""}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-emerald-700">
              {formatSharesFull(totalBuys)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Disposed{timeRange !== "MAX" ? ` (${timeRange})` : ""}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-red-600">
              {formatSharesFull(totalSells)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-zinc-200 p-0.5">
          <button
            type="button"
            onClick={() => setChartMode("activity")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              chartMode === "activity"
                ? "bg-emerald-700 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Buy &amp; sell volume
          </button>
          <button
            type="button"
            onClick={() => setChartMode("holdings")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              chartMode === "holdings"
                ? "bg-emerald-700 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Holdings by person
          </button>
        </div>

        {chartMode === "holdings" && holdingsSecurity ? (
          <span className="text-xs text-zinc-500">
            Showing {holdingsSecurity}
            {effectiveSelectedOwners.length > 8 ? " · first 8 owners shown" : null}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {owners.map((owner) => {
          const isSelected = selectedOwners.has(owner);
          return (
            <button
              key={owner}
              type="button"
              onClick={() => toggleOwner(owner)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                isSelected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {owner}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {hasChartData ? (
          chartMode === "activity" ? (
            <EvilBarChart
              data={activityData}
              config={activityChartConfig}
              animationType="left-to-right"
              className="h-[280px] w-full"
            >
              <Grid />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatAxisDateForRange(String(value), timeRange)}
                minTickGap={48}
              />
              <YAxis tickFormatter={(value) => formatShares(Number(value))} width={72} />
              <Tooltip />
              <Legend />
              <Bar dataKey="buys" variant="gradient" />
              <Bar dataKey="sells" variant="gradient" />
            </EvilBarChart>
          ) : (
            <EvilLineChart
              data={holdingsData}
              config={holdingsConfig as ChartConfig}
              curveType="monotone"
              animationType="left-to-right"
              className="h-[280px] w-full"
            >
              <LineGrid />
              <LineXAxis
                dataKey="date"
                tickFormatter={(value) => formatAxisDateForRange(String(value), timeRange)}
                minTickGap={48}
              />
              <LineYAxis tickFormatter={(value) => formatShares(Number(value))} width={72} />
              <LineTooltip />
              <LineLegend />
              {holdingsSeries.map((line) => (
                <Line key={line.key} dataKey={line.key}>
                  <Dot variant="default" />
                  <LineActiveDot variant="colored-border" />
                </Line>
              ))}
            </EvilLineChart>
          )
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">
            No chart data for the selected owners
            {chartMode === "holdings" ? " and security" : ""}
            {timeRange !== "MAX" ? ` in the last ${timeRange}` : ""}.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1">
        {TIME_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTimeRange(option.value)}
            className={`min-w-[2.25rem] rounded-md px-2 py-1 text-xs font-semibold transition ${
              timeRange === option.value
                ? "bg-emerald-700 text-white"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {hasChartData && chartMode === "holdings" ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {holdingsSeries.map((line) => (
            <div key={line.key} className="flex items-center gap-2 text-xs text-zinc-600">
              <span
                className="inline-block h-0.5 w-5 rounded-full"
                style={{ backgroundColor: line.color }}
              />
              <span>{line.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
