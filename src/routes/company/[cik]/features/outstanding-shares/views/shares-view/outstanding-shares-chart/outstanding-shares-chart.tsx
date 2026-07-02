"use client";

import { useMemo } from "react";
import {
  ActiveDot,
  Area,
  Dot,
  EvilAreaChart,
  Grid,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/evilcharts/charts/area-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/chart";
import { SharesDataTable } from "./components/shares-data-table";
import { buildSharesChartData } from "./lib/build-chart-data";
import type { OutstandingSharesChartProps } from "./types";
import { formatAxisDate, formatShares, formatSharesFull, formatTableDate } from "./utils/format-shares";

const chartConfig = {
  shares: {
    label: "Shares outstanding",
    colors: { light: ["#047857"] },
  },
} satisfies ChartConfig;

export function OutstandingSharesChart({ points }: OutstandingSharesChartProps) {
  const chartData = useMemo(() => buildSharesChartData(points), [points]);
  const latest = chartData[chartData.length - 1];
  const earliest = chartData[0];
  const changePct =
    earliest && latest && earliest.shares > 0
      ? ((latest.shares - earliest.shares) / earliest.shares) * 100
      : null;

  if (chartData.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-zinc-900">Outstanding shares</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No 10-K or 10-Q share count data found in SEC XBRL filings.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Outstanding shares</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Common shares outstanding from 10-K and 10-Q filings — cover page count
              (DEI) with balance sheet fallback (US GAAP).
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Latest</p>
              <p className="mt-1 font-mono text-xl font-semibold text-zinc-900">
                {formatSharesFull(latest.shares)}
              </p>
              <p className="mt-0.5 text-zinc-500">
                as of {formatTableDate(latest.asOfDate)} · {latest.form}
              </p>
            </div>
            {changePct !== null ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Change</p>
                <p
                  className={`mt-1 font-mono text-xl font-semibold ${
                    changePct >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(1)}%
                </p>
                <p className="mt-0.5 text-zinc-500">since {formatTableDate(earliest.asOfDate)}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6">
        <EvilAreaChart
          data={chartData}
          config={chartConfig}
          curveType="monotone"
          animationType="left-to-right"
          className="h-[280px] w-full"
        >
          <Grid />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatAxisDate(String(value))}
            minTickGap={48}
          />
          <YAxis tickFormatter={(value) => formatShares(Number(value))} width={72} />
          <Tooltip />
          <Area dataKey="shares" variant="gradient">
            <Dot variant="default" />
            <ActiveDot variant="colored-border" />
          </Area>
        </EvilAreaChart>
      </div>

      <SharesDataTable points={points} />
    </section>
  );
}
