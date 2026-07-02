"use client";

import { useMemo, useState } from "react";
import { SharesChartSvg } from "./components/shares-chart-svg";
import { SharesDataTable } from "./components/shares-data-table";
import { buildChartGeometry } from "./lib/build-chart-geometry";
import type { OutstandingSharesChartProps } from "./types";
import { formatSharesFull, formatTableDate } from "./utils/format-shares";

export function OutstandingSharesChart({ points }: OutstandingSharesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => Date.parse(a.asOfDate) - Date.parse(b.asOfDate)),
    [points],
  );
  const { chartPoints, yTicks, xLabels } = useMemo(
    () => buildChartGeometry(sortedPoints),
    [sortedPoints],
  );
  const latest = sortedPoints[sortedPoints.length - 1];
  const earliest = sortedPoints[0];
  const changePct =
    earliest && latest && earliest.shares > 0
      ? ((latest.shares - earliest.shares) / earliest.shares) * 100
      : null;

  if (sortedPoints.length === 0) {
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

  const activePoint = hoveredIndex !== null ? chartPoints[hoveredIndex] : latest;

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
                {formatSharesFull(activePoint.shares)}
              </p>
              <p className="mt-0.5 text-zinc-500">
                as of {formatTableDate(activePoint.asOfDate)} · {activePoint.form}
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
        <SharesChartSvg
          chartPoints={chartPoints}
          yTicks={yTicks}
          xLabels={xLabels}
          sortedPoints={sortedPoints}
          hoveredIndex={hoveredIndex}
          onHoverIndexChange={setHoveredIndex}
        />
      </div>

      <SharesDataTable points={sortedPoints} />
    </section>
  );
}
