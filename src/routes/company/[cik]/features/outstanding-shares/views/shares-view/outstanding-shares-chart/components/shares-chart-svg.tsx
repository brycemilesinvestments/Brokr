import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";
import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import { areaPath, linePath } from "../lib/chart-paths";
import type { ChartPoint } from "../types";
import { formatShares, formatSharesFull, formatTableDate } from "../utils/format-shares";

type SharesChartSvgProps = {
  chartPoints: ChartPoint[];
  yTicks: number[];
  xLabels: Array<{ x: number; label: string }>;
  sortedPoints: OutstandingSharePoint[];
  hoveredIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
};

export function SharesChartSvg({
  chartPoints,
  yTicks,
  xLabels,
  sortedPoints,
  hoveredIndex,
  onHoverIndexChange,
}: SharesChartSvgProps) {
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-[560px]"
        role="img"
        aria-label="Outstanding shares over time"
      >
        {yTicks.map((tick) => {
          const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
          const minShares = Math.min(...sortedPoints.map((p) => p.shares));
          const maxShares = Math.max(...sortedPoints.map((p) => p.shares));
          const shareRange = maxShares - minShares || maxShares * 0.1;
          const yMin = minShares - shareRange * 0.08;
          const yMax = maxShares + shareRange * 0.08;
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

        <path d={areaPath(chartPoints)} fill="url(#sharesGradient)" />
        <path
          d={linePath(chartPoints)}
          fill="none"
          stroke="#047857"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {chartPoints.map((point, index) => (
          <g key={`${point.accessionNumber}-${point.asOfDate}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 6 : 4}
              fill={hoveredIndex === index ? "#065f46" : "#047857"}
              className="cursor-pointer"
              onMouseEnter={() => onHoverIndexChange(index)}
              onMouseLeave={() => onHoverIndexChange(null)}
            />
            <title>
              {formatSharesFull(point.shares)} as of {formatTableDate(point.asOfDate)} (
              {point.form})
            </title>
          </g>
        ))}

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

        <defs>
          <linearGradient id="sharesGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#047857" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
