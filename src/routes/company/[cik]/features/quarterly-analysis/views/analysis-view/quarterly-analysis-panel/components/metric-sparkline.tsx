"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ChartPoint } from "@/lib/analysis";
import type { MetricPolarity } from "@/lib/metrics/polarity/types";
import {
  SENTIMENT_CHART_COLORS,
  sentimentFromTrend,
  trendDirectionFromValues,
} from "@/lib/metrics/polarity";
import { guessPolarityFromMetricKey } from "@/lib/metrics/polarity/heuristics";
import {
  formatAxisDate,
  formatMetricValue,
} from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";
import { cn } from "@/lib/utils";

const PADDING = 6;

type MetricSparklineProps = {
  points: ChartPoint[];
  metric?: string;
  polarity?: MetricPolarity;
  interactive?: boolean;
  className?: string;
};

type SparklineGeometry = {
  linePath: string;
  areaPath: string;
  coords: Array<{ x: number; y: number }>;
};

type SparklineSize = {
  width: number;
  height: number;
};

const EMPTY_SPARKLINE_SIZE: SparklineSize = { width: 0, height: 0 };
const elementSizeCache = new WeakMap<HTMLElement, SparklineSize>();

function subscribeToElementSize(element: HTMLElement | null, onStoreChange: () => void) {
  if (!element) return () => {};

  const observer = new ResizeObserver(onStoreChange);
  observer.observe(element);
  return () => observer.disconnect();
}

function readElementSize(element: HTMLElement | null): SparklineSize {
  if (!element) return EMPTY_SPARKLINE_SIZE;

  const rect = element.getBoundingClientRect();
  const width = Math.max(0, Math.round(rect.width));
  const height = Math.max(0, Math.round(rect.height));
  const cached = elementSizeCache.get(element);

  if (cached && cached.width === width && cached.height === height) {
    return cached;
  }

  const next = { width, height };
  elementSizeCache.set(element, next);
  return next;
}

function buildSparklineGeometry(points: ChartPoint[], width: number, height: number): SparklineGeometry {
  if (points.length === 0 || width <= 0 || height <= 0) {
    return { linePath: "", areaPath: "", coords: [] };
  }

  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - PADDING * 2;
  const innerHeight = height - PADDING * 2;
  const baseline = height - PADDING;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width - PADDING
        : PADDING + (index / (points.length - 1)) * innerWidth;
    const y = PADDING + (1 - (point.y - min) / range) * innerHeight;
    return { x, y };
  });

  const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x} ${coord.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x} ${baseline} L${coords[0].x} ${baseline} Z`;

  return { linePath, areaPath, coords };
}

function nearestPointIndex(clientX: number, rect: DOMRect, pointCount: number): number {
  if (pointCount <= 1) return 0;
  const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const ratio = relativeX / rect.width;
  return Math.min(pointCount - 1, Math.max(0, Math.round(ratio * (pointCount - 1))));
}

export function MetricSparkline({
  points,
  metric,
  polarity,
  interactive = false,
  className,
}: MetricSparklineProps) {
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const size = useSyncExternalStore(
    (onStoreChange) => subscribeToElementSize(rootElement, onStoreChange),
    () => readElementSize(rootElement),
    () => EMPTY_SPARKLINE_SIZE,
  );

  const chartColor = useMemo(() => {
    const resolvedPolarity = polarity ?? (metric ? guessPolarityFromMetricKey(metric) : "neutral");
    const trend = trendDirectionFromValues(points[0]?.y, points[points.length - 1]?.y);
    const sentiment = sentimentFromTrend(resolvedPolarity, trend);
    return SENTIMENT_CHART_COLORS[sentiment];
  }, [metric, polarity, points]);

  const { linePath, areaPath, coords } = buildSparklineGeometry(points, size.width, size.height);
  const activePoint = activeIndex !== null ? points[activeIndex] : null;
  const activeCoord = activeIndex !== null ? coords[activeIndex] : null;

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !rootElement || points.length === 0) return;
      const rect = rootElement.getBoundingClientRect();
      setActiveIndex(nearestPointIndex(event.clientX, rect, points.length));
    },
    [interactive, points.length, rootElement],
  );

  const handlePointerLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (!linePath) {
    return <div ref={setRootElement} className={cn("h-20 w-full rounded bg-zinc-50", className)} />;
  }

  return (
    <div
      ref={setRootElement}
      className={cn("relative h-20 w-full", interactive && "touch-none", className)}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerLeave={interactive ? handlePointerLeave : undefined}
    >
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        className="block h-full w-full"
        aria-hidden
      >
        <path d={areaPath} fill={chartColor} fillOpacity={activeIndex !== null ? 0.14 : 0.08} />
        <path
          d={linePath}
          fill="none"
          stroke={chartColor}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {activeCoord ? (
          <>
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={PADDING}
              y2={size.height - PADDING}
              stroke={chartColor}
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.45}
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r={3.5}
              fill={chartColor}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </>
        ) : null}
      </svg>

      {interactive && activePoint && activeCoord && size.width > 0 && size.height > 0 ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-zinc-200 bg-white px-2 py-1 shadow-md"
          style={{
            left: `${(activeCoord.x / size.width) * 100}%`,
            top: activeCoord.y < size.height / 2 ? "calc(100% + 4px)" : "-4px",
            transform:
              activeCoord.y < size.height / 2
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
          }}
        >
          <p className="whitespace-nowrap font-mono text-[9px] text-zinc-500">
            {formatAxisDate(activePoint.x)}
          </p>
          <p className="whitespace-nowrap font-mono text-[10.5px] font-semibold text-zinc-900">
            {metric ? formatMetricValue(metric, activePoint.y) : activePoint.y.toLocaleString()}
          </p>
        </div>
      ) : null}
    </div>
  );
}
