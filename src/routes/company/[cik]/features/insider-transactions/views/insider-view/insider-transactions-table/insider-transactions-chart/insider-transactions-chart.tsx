"use client";

import { CHART_HEIGHT, CHART_WIDTH, PADDING, TIME_RANGE_OPTIONS } from "./constants";
import { useInsiderTransactionsChart } from "./hooks/use-insider-transactions-chart";
import type { InsiderTransactionsChartProps } from "./types";
import { formatTableDate } from "./utils/format-dates";
import { formatShares, formatSharesFull } from "./utils/format-shares";
import { linePath } from "./utils/line-path";

export function InsiderTransactionsChart({ transactions }: InsiderTransactionsChartProps) {
  const {
    owners,
    chartMode,
    setChartMode,
    timeRange,
    setTimeRange,
    hover,
    svgRef,
    selectedOwners,
    effectiveSelectedOwners,
    holdingsSecurity,
    lines,
    yTicks,
    xLabels,
    yMin,
    yMax,
    plotWidth,
    plotHeight,
    handleChartMouseMove,
    handleChartMouseLeave,
    activeDots,
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

      <div className="relative mt-4 overflow-x-auto">
        {hasChartData ? (
          <>
            {hover ? (
              <div
                className="pointer-events-none absolute z-10 min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md"
                style={{
                  left: `${(hover.x / CHART_WIDTH) * 100}%`,
                  top: 8,
                  transform: "translateX(-50%)",
                }}
              >
                <p className="text-xs font-medium text-zinc-500">{formatTableDate(hover.date)}</p>
                <ul className="mt-1.5 space-y-1">
                  {hover.entries.map((entry) => (
                    <li
                      key={entry.label}
                      className="flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-zinc-700">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="max-w-[9rem] truncate">{entry.label}</span>
                      </span>
                      <span className="font-mono font-medium text-zinc-900">
                        {formatSharesFull(entry.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full min-w-[560px]"
              role="img"
              aria-label={
                chartMode === "activity"
                  ? "Insider buy and sell volume over time"
                  : "Insider holdings over time by reporting owner"
              }
            >
              {yTicks.map((tick) => {
                const y =
                  PADDING.top + plotHeight - ((tick - yMin) / (yMax - yMin)) * plotHeight;

                return (
                  <g key={tick}>
                    <line
                      x1={PADDING.left}
                      x2={CHART_WIDTH - PADDING.right}
                      y1={y}
                      y2={y}
                      stroke="#e4e4e7"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={PADDING.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-zinc-500 text-[11px]"
                    >
                      {formatShares(tick)}
                    </text>
                  </g>
                );
              })}

              {lines.map((line) => (
                <g key={line.id}>
                  <path
                    d={linePath(line.chartPoints)}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {line.chartPoints.map((point) => (
                    <circle
                      key={`${line.id}-${point.date}-${point.value}`}
                      cx={point.x}
                      cy={point.y}
                      r={3.5}
                      fill={line.color}
                      opacity={hover ? 0.35 : 1}
                    />
                  ))}
                </g>
              ))}

              {hover ? (
                <>
                  <line
                    x1={hover.x}
                    x2={hover.x}
                    y1={PADDING.top}
                    y2={CHART_HEIGHT - PADDING.bottom}
                    stroke="#71717a"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  {activeDots.map((dot) => (
                    <circle
                      key={dot.lineId}
                      cx={dot.x}
                      cy={dot.y}
                      r={5.5}
                      fill={dot.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ))}
                </>
              ) : null}

              {xLabels.map((label) => (
                <text
                  key={`${label.x}-${label.label}`}
                  x={label.x}
                  y={CHART_HEIGHT - 14}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[11px]"
                >
                  {label.label}
                </text>
              ))}

              <rect
                x={PADDING.left}
                y={PADDING.top}
                width={plotWidth}
                height={plotHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              />
            </svg>
          </>
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

      {hasChartData ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center gap-2 text-xs text-zinc-600">
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
