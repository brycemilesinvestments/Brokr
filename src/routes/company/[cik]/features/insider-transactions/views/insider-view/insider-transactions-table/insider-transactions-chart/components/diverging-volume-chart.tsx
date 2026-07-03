"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DIVERGING_CHART_HEIGHT,
  DIVERGING_CHART_WIDTH,
  DIVERGING_COLORS,
} from "../constants";
import {
  buildDivergingGeometry,
  type DivergingBarGeometry,
} from "../lib/build-diverging-geometry";
import type { MonthlyVolumeBucket } from "../lib/build-monthly-volume";
import type { HoverState } from "../types";
import { formatShares } from "../utils/format-shares";

type DivergingVolumeChartProps = {
  buckets: MonthlyVolumeBucket[];
};

function snapBar(
  bars: DivergingBarGeometry[],
  clientX: number,
  svgRect: DOMRect,
): DivergingBarGeometry | null {
  if (bars.length === 0) return null;

  const x = ((clientX - svgRect.left) / svgRect.width) * DIVERGING_CHART_WIDTH;
  let closest = bars[0];
  let closestDistance = Math.abs(x - closest.centerX);

  for (const bar of bars) {
    const distance = Math.abs(x - bar.centerX);
    if (distance < closestDistance) {
      closest = bar;
      closestDistance = distance;
    }
  }

  return closest;
}

export function DivergingVolumeChart({ buckets }: DivergingVolumeChartProps) {
  const geometry = useMemo(() => buildDivergingGeometry(buckets), [buckets]);
  const [hover, setHover] = useState<HoverState | null>(null);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;

      const bar = snapBar(geometry.bars, event.clientX, svg.getBoundingClientRect());
      if (!bar) {
        setHover(null);
        return;
      }

      setHover({
        x: bar.centerX,
        date: bar.label,
        time: 0,
        entries: [
          ...(bar.acquired > 0
            ? [{ label: "Acquired", color: DIVERGING_COLORS.acquired, value: bar.acquired }]
            : []),
          ...(bar.disposed > 0
            ? [{ label: "Disposed", color: DIVERGING_COLORS.disposed, value: bar.disposed }]
            : []),
        ],
      });
    },
    [geometry.bars],
  );

  const activeMonthKey = hover
    ? geometry.bars.find((bar) => bar.centerX === hover.x)?.monthKey
    : null;

  return (
    <div className="relative px-3 pb-2">
      {hover && hover.entries.length > 0 ? (
        <div
          className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md"
          style={{
            left: `${(hover.x / DIVERGING_CHART_WIDTH) * 100}%`,
            top: 8,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-xs font-medium text-zinc-500">{hover.date}</p>
          {hover.entries.map((entry) => (
            <div
              key={entry.label}
              className="mt-1 flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.label}
              </span>
              <span className="font-mono font-medium text-zinc-900">
                {formatShares(entry.value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${DIVERGING_CHART_WIDTH} ${DIVERGING_CHART_HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label="Monthly insider share volume chart with acquired bars above and disposed bars below a zero baseline"
      >
        {geometry.acquiredTicks.map((tick) => (
          <g key={`acquired-${tick.label}`}>
            <line
              x1={geometry.plotLeft}
              y1={tick.y}
              x2={geometry.plotRight}
              y2={tick.y}
              stroke={DIVERGING_COLORS.grid}
              strokeWidth={1}
            />
            <text
              x={geometry.plotLeft - 9}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={9}
              fill={DIVERGING_COLORS.axisLabel}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {geometry.disposedTicks.map((tick) => (
          <g key={`disposed-${tick.label}`}>
            <line
              x1={geometry.plotLeft}
              y1={tick.y}
              x2={geometry.plotRight}
              y2={tick.y}
              stroke={DIVERGING_COLORS.grid}
              strokeWidth={1}
            />
            <text
              x={geometry.plotLeft - 9}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={9}
              fill={DIVERGING_COLORS.axisLabel}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {geometry.bars.map((bar) => {
          const isActive = activeMonthKey === bar.monthKey;
          return (
            <g key={bar.monthKey} opacity={hover && !isActive ? 0.35 : 1}>
              {bar.acquiredRect ? (
                <rect
                  x={bar.acquiredRect.x}
                  y={bar.acquiredRect.y}
                  width={bar.acquiredRect.width}
                  height={bar.acquiredRect.height}
                  rx={2.5}
                  fill={DIVERGING_COLORS.acquired}
                />
              ) : null}
              {bar.disposedRect ? (
                <rect
                  x={bar.disposedRect.x}
                  y={bar.disposedRect.y}
                  width={bar.disposedRect.width}
                  height={bar.disposedRect.height}
                  rx={2.5}
                  fill={DIVERGING_COLORS.disposed}
                />
              ) : null}
              <text
                x={bar.centerX}
                y={DIVERGING_CHART_HEIGHT - 14}
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
                fontSize={9.5}
                fill={DIVERGING_COLORS.monthLabel}
              >
                {bar.label}
              </text>
            </g>
          );
        })}

        {hover ? (
          <line
            x1={hover.x}
            y1={geometry.plotTop}
            x2={hover.x}
            y2={geometry.plotBottom}
            stroke="#71717a"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        ) : null}

        <line
          x1={geometry.plotLeft}
          y1={geometry.zeroY}
          x2={geometry.plotRight}
          y2={geometry.zeroY}
          stroke={DIVERGING_COLORS.zeroLine}
          strokeWidth={1.5}
        />
        <text
          x={geometry.plotLeft - 9}
          y={geometry.zeroY}
          textAnchor="end"
          dominantBaseline="middle"
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={9}
          fontWeight={600}
          fill={DIVERGING_COLORS.zeroLine}
        >
          0
        </text>

        <rect
          x={geometry.plotLeft}
          y={geometry.plotTop}
          width={geometry.plotRight - geometry.plotLeft}
          height={geometry.plotBottom - geometry.plotTop}
          fill="transparent"
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
    </div>
  );
}
