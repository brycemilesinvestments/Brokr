import { useEffect } from "react";
import type { ChartPoint } from "@/lib/analysis";
import { humanizeConcept } from "@/routes/company/[cik]/features/financial-trends/utils/humanize-concept";
import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import { useMetricLineChartHover } from "../hooks/use-metric-line-chart-hover";
import { chartPaths, type PlottedPoint } from "../lib/build-metric-chart-geometry";
import { formatAxisDate, formatDeltaPercent, formatMetricValue } from "../utils/format-metric";

type MetricLineChartProps = {
  metric: string;
  chartPoints: PlottedPoint[];
  yTicks: number[];
  xLabels: Array<{ x: number; label: string }>;
  yMin: number;
  yMax: number;
  onActivePointChange?: (point: PlottedPoint | null) => void;
};

export function MetricLineChart({
  metric,
  chartPoints,
  yTicks,
  xLabels,
  yMin,
  yMax,
  onActivePointChange,
}: MetricLineChartProps) {
  const label = metric.includes("_") ? metric.replace(/_/g, " ") : humanizeConcept(metric);
  const paths = chartPaths(chartPoints, yMax, yMin);
  const { svgRef, hover, plotWidth, plotHeight, handleChartMouseMove, handleChartMouseLeave } =
    useMetricLineChartHover(chartPoints);

  const displayPoint = hover?.point ?? chartPoints[chartPoints.length - 1] ?? null;

  useEffect(() => {
    onActivePointChange?.(displayPoint);
  }, [displayPoint, onActivePointChange]);

  if (chartPoints.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No data points for this metric and frequency.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md"
          style={{
            left: `${(hover.x / CHART_WIDTH) * 100}%`,
            top: 8,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-xs font-medium text-zinc-500">
            {formatAxisDate(hover.point.x)} · {hover.point.frequency}
          </p>
          <ul className="mt-1.5 space-y-1">
            <li className="flex items-center justify-between gap-4 text-xs">
              <span className="text-zinc-700">{label}</span>
              <span className="font-mono font-medium text-zinc-900">
                {formatMetricValue(metric, hover.point.y)}
              </span>
            </li>
            {hover.point.frequency === "quarterly" && hover.point.delta_qoq !== undefined ? (
              <li className="flex items-center justify-between gap-4 text-xs">
                <span className="text-zinc-500">QoQ</span>
                <span className="font-mono text-zinc-700">
                  {formatDeltaPercent(hover.point.delta_qoq)}
                </span>
              </li>
            ) : null}
            {hover.point.delta_yoy !== undefined ? (
              <li className="flex items-center justify-between gap-4 text-xs">
                <span className="text-zinc-500">YoY</span>
                <span className="font-mono text-zinc-700">
                  {formatDeltaPercent(hover.point.delta_yoy)}
                </span>
              </li>
            ) : null}
            {hover.point.anomaly ? (
              <li className="text-xs font-medium text-red-700">Flagged anomaly</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-[560px]"
        role="img"
        aria-label={`${label} over time`}
      >
        {yTicks.map((tick) => {
          const plotHeightInner = CHART_HEIGHT - PADDING.top - PADDING.bottom;
          const y = PADDING.top + plotHeightInner - ((tick - yMin) / (yMax - yMin)) * plotHeightInner;

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
              <text x={PADDING.left - 10} y={y + 4} textAnchor="end" className="fill-zinc-500 text-[11px]">
                {formatMetricValue(metric, tick)}
              </text>
            </g>
          );
        })}

        <path d={paths.area} fill="url(#metricGradient)" />
        <path
          d={paths.line}
          fill="none"
          stroke="#047857"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {chartPoints.map((point, index) => (
          <circle
            key={`${point.x}-${point.frequency}`}
            cx={point.plotX}
            cy={point.plotY}
            r={hover?.index === index ? 5.5 : 3.5}
            fill={point.anomaly ? "#dc2626" : "#047857"}
            stroke={hover?.index === index ? "#ffffff" : point.anomaly ? "#991b1b" : "none"}
            strokeWidth={hover?.index === index ? 2 : point.anomaly ? 2 : 0}
            opacity={hover && hover.index !== index ? 0.35 : 1}
          />
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
            <circle
              cx={hover.point.plotX}
              cy={hover.point.plotY}
              r={5.5}
              fill={hover.point.anomaly ? "#dc2626" : "#047857"}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </>
        ) : null}

        {xLabels.map((labelItem) => (
          <text
            key={`${labelItem.x}-${labelItem.label}`}
            x={labelItem.x}
            y={CHART_HEIGHT - 14}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px]"
          >
            {labelItem.label}
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

        <defs>
          <linearGradient id="metricGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#047857" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function filterChartPoints(
  allPoints: ChartPoint[] | undefined,
  frequency: "quarterly" | "annual" | "both",
): ChartPoint[] {
  if (!allPoints) return [];
  const filtered =
    frequency === "both"
      ? allPoints
      : allPoints.filter((p) => p.frequency === frequency);
  return [...filtered].sort((a, b) => a.x.localeCompare(b.x));
}
