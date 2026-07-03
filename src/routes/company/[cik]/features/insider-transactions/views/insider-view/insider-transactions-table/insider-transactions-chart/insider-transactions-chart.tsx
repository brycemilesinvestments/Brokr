"use client";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChartTimeRangeSwitch } from "@/routes/company/[cik]/components/chart-time-range-switch";
import { type ChartConfig } from "@/components/evilcharts/ui/chart";
import { DivergingVolumeChart } from "./components/diverging-volume-chart";
import { NetInsiderPositionChart } from "./components/net-insider-position-chart";
import { useInsiderTransactionsChart } from "./hooks/use-insider-transactions-chart";
import type { InsiderTransactionsChartProps } from "./types";
import { formatAxisDateForRange } from "./utils/format-dates";
import { formatShares, formatSharesHeader } from "./utils/format-shares";

export function InsiderTransactionsChart({
  transactions,
  ticker,
}: InsiderTransactionsChartProps) {
  const {
    chartMode,
    setChartMode,
    holdingsView,
    setHoldingsView,
    timeRange,
    setTimeRange,
    holdingsSecurity,
    monthlyVolume,
    exclusionFootnote,
    netPositionRows,
    holdingsData,
    holdingsSeries,
    holdingsConfig,
    totalBuys,
    totalSells,
    hasChartData,
  } = useInsiderTransactionsChart(transactions);

  if (transactions.length === 0) {
    return null;
  }

  const showNetPosition = holdingsView === "net-position";

  return (
    <div className="border-b border-zinc-100">
      <div className="flex flex-wrap items-center gap-2 px-6 pt-5">
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

        {chartMode === "holdings" ? (
          <div className="flex items-center gap-2">
            <Label
              htmlFor="holdings-view-switch"
              className={`text-xs font-medium ${!showNetPosition ? "text-zinc-900" : "text-zinc-500"}`}
            >
              Holdings over time
            </Label>
            <Switch
              id="holdings-view-switch"
              checked={showNetPosition}
              onCheckedChange={(checked) =>
                setHoldingsView(checked ? "net-position" : "timeline")
              }
            />
            <Label
              htmlFor="holdings-view-switch"
              className={`text-xs font-medium ${showNetPosition ? "text-zinc-900" : "text-zinc-500"}`}
            >
              Net position
            </Label>
          </div>
        ) : null}

        {chartMode === "holdings" && holdingsView === "timeline" && holdingsSecurity ? (
          <span className="text-xs text-zinc-500">Showing {holdingsSecurity}</span>
        ) : null}
      </div>

      {chartMode === "activity" ? (
        <div className="mx-6 mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-[26px] pt-[22px] pb-3.5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-mono text-[10.5px] font-semibold tracking-[0.09em] text-emerald-600 uppercase">
                Insider transactions · Form 4
              </div>
              <div className="mt-1.5 flex items-center gap-2.5">
                <h3 className="text-[17px] font-semibold text-zinc-900">Monthly share volume</h3>
                {ticker ? (
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-600">
                    {ticker}
                  </span>
                ) : null}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-zinc-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-700" />
                  Acquired (A)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                  Disposed (D)
                </span>
              </div>
            </div>
            <div className="flex gap-6 sm:gap-[26px]">
              <div className="text-right">
                <div className="font-mono text-[9.5px] font-semibold tracking-[0.06em] text-zinc-400 uppercase">
                  Acquired
                </div>
                <div className="mt-0.5 font-mono text-[19px] font-semibold text-emerald-700">
                  {formatSharesHeader(totalBuys)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9.5px] font-semibold tracking-[0.06em] text-zinc-400 uppercase">
                  Disposed
                </div>
                <div className="mt-0.5 font-mono text-[19px] font-semibold text-red-600">
                  {formatSharesHeader(totalSells)}
                </div>
              </div>
            </div>
          </div>

          {hasChartData ? (
            <DivergingVolumeChart buckets={monthlyVolume} />
          ) : (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">
              No chart data
              {timeRange !== "MAX" ? ` in the last ${timeRange}` : ""}.
            </p>
          )}

          <div className="mt-1 border-t border-zinc-100 px-[26px] py-3.5 text-[11px] leading-relaxed text-zinc-400">
            Bars use a log scale (share counts labeled on both axes) so small open-market
            sells stay visible beside large equity grants.
            {exclusionFootnote ? (
              <>
                {" "}
                {exclusionFootnote}
              </>
            ) : null}
          </div>
        </div>
      ) : showNetPosition ? (
        <div className="mx-6 mt-4">
          {hasChartData ? (
            <NetInsiderPositionChart rows={netPositionRows} />
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">
              No net insider activity
              {timeRange !== "MAX" ? ` in the last ${timeRange}` : ""}.
            </p>
          )}
        </div>
      ) : (
        <div className="px-6 py-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Holdings chart</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Each line tracks shares owned after each reported transaction. “Shares owned after”
              is the insider’s total holding in that security immediately following the trade.
            </p>
          </div>

          <div className="mt-4">
            {hasChartData ? (
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
            ) : (
              <p className="py-8 text-center text-sm text-zinc-500">
                No chart data for the selected security
                {timeRange !== "MAX" ? ` in the last ${timeRange}` : ""}.
              </p>
            )}
          </div>

          {hasChartData ? (
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
      )}

      <ChartTimeRangeSwitch
        value={timeRange}
        onChange={setTimeRange}
        className="mt-3 px-6 pb-5"
      />
    </div>
  );
}
