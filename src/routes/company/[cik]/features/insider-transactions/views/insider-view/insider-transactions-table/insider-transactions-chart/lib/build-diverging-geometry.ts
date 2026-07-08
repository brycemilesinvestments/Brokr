import {
  DIVERGING_CHART_HEIGHT,
  DIVERGING_CHART_WIDTH,
  DIVERGING_COLORS,
  DIVERGING_PADDING,
  DIVERGING_ZERO_Y,
} from "../constants";
import type { MonthlyVolumeBucket } from "./build-monthly-volume";
import { buildMonthAxisLabels } from "../utils/build-month-axis-labels";

export type DivergingBarGeometry = {
  monthKey: string;
  label: string;
  axisLabel: string | null;
  acquired: number;
  disposed: number;
  centerX: number;
  barWidth: number;
  hitX: number;
  hitWidth: number;
  acquiredRect: { x: number; y: number; width: number; height: number } | null;
  disposedRect: { x: number; y: number; width: number; height: number } | null;
};

export type DivergingChartGeometry = {
  bars: DivergingBarGeometry[];
  acquiredTicks: Array<{ y: number; label: string }>;
  disposedTicks: Array<{ y: number; label: string }>;
  plotTop: number;
  plotBottom: number;
  plotLeft: number;
  plotRight: number;
  zeroY: number;
};

const DEFAULT_MIN_LOG_VALUE = 10_000;
const DEFAULT_MAX_LOG_VALUE = 1_000_000;

type LogScale = {
  min: number;
  max: number;
  ticks: number[];
};

function collectPositiveValues(buckets: MonthlyVolumeBucket[]): number[] {
  const values: number[] = [];
  for (const bucket of buckets) {
    if (bucket.acquired > 0) values.push(bucket.acquired);
    if (bucket.disposed > 0) values.push(bucket.disposed);
  }
  return values;
}

function roundToNiceTick(value: number): number {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const normalized = value / base;

  if (normalized < 2) return base;
  if (normalized < 5) return 2 * base;
  if (normalized < 10) return 5 * base;
  return 10 * base;
}

function computeLogScale(buckets: MonthlyVolumeBucket[]): LogScale {
  const values = collectPositiveValues(buckets);
  if (values.length === 0) {
    return {
      min: DEFAULT_MIN_LOG_VALUE,
      max: DEFAULT_MAX_LOG_VALUE,
      ticks: [DEFAULT_MIN_LOG_VALUE, 100_000, DEFAULT_MAX_LOG_VALUE],
    };
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  let min = 10 ** Math.floor(Math.log10(Math.max(dataMin, 1)));
  let max = 10 ** Math.ceil(Math.log10(Math.max(dataMax, 1)));

  if (max <= min) {
    max = min * 10;
  }

  const mid = roundToNiceTick(10 ** ((Math.log10(min) + Math.log10(max)) / 2));
  const ticks = [...new Set([min, mid, max])].toSorted((a, b) => a - b);

  return { min, max, ticks };
}

function logHeight(
  value: number,
  plotHeight: number,
  scale: LogScale,
): number {
  if (value <= 0) return 0;

  const minLog = Math.log10(scale.min);
  const maxLog = Math.log10(scale.max);
  const logValue = Math.log10(Math.max(value, scale.min));
  const clamped = Math.min(maxLog, Math.max(minLog, logValue));

  return ((clamped - minLog) / (maxLog - minLog)) * plotHeight;
}

function tickPositions(
  plotHeight: number,
  scale: LogScale,
  direction: "up" | "down",
): Array<{ y: number; label: string }> {
  const minLog = Math.log10(scale.min);
  const maxLog = Math.log10(scale.max);

  return scale.ticks.map((value) => {
    const logValue = Math.log10(value);
    const offset = ((logValue - minLog) / (maxLog - minLog)) * plotHeight;
    return {
      y: direction === "up" ? DIVERGING_ZERO_Y - offset : DIVERGING_ZERO_Y + offset,
      label: value >= 1_000_000 ? "1.00M" : formatTickLabel(value),
    };
  });
}

function formatTickLabel(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString("en-US");
}

export function buildDivergingGeometry(
  buckets: MonthlyVolumeBucket[],
): DivergingChartGeometry {
  const scale = computeLogScale(buckets);
  const plotLeft = DIVERGING_PADDING.left;
  const plotRight = DIVERGING_CHART_WIDTH - DIVERGING_PADDING.right;
  const plotTop = DIVERGING_PADDING.top;
  const plotBottom = DIVERGING_CHART_HEIGHT - DIVERGING_PADDING.bottom;
  const plotWidth = plotRight - plotLeft;
  const topPlotHeight = DIVERGING_ZERO_Y - plotTop;
  const bottomPlotHeight = plotBottom - DIVERGING_ZERO_Y;
  const slotWidth = buckets.length > 0 ? plotWidth / buckets.length : plotWidth;
  const barWidth = Math.min(28, slotWidth * 0.56);
  const hitWidth = slotWidth;
  const axisLabels = buildMonthAxisLabels(
    buckets.map((bucket) => bucket.monthKey),
    plotWidth,
  );

  const bars = buckets.map((bucket, index) => {
    const centerX = plotLeft + (index + 0.5) * slotWidth;
    const barX = centerX - barWidth / 2;
    const acquiredHeight = logHeight(bucket.acquired, topPlotHeight, scale);
    const disposedHeight = logHeight(bucket.disposed, bottomPlotHeight, scale);

    return {
      monthKey: bucket.monthKey,
      label: bucket.label,
      axisLabel: axisLabels[index] ?? null,
      acquired: bucket.acquired,
      disposed: bucket.disposed,
      centerX,
      barWidth,
      hitX: plotLeft + index * slotWidth,
      hitWidth,
      acquiredRect:
        acquiredHeight > 0
          ? {
              x: barX,
              y: DIVERGING_ZERO_Y - acquiredHeight,
              width: barWidth,
              height: acquiredHeight,
            }
          : null,
      disposedRect:
        disposedHeight > 0
          ? {
              x: barX,
              y: DIVERGING_ZERO_Y,
              width: barWidth,
              height: disposedHeight,
            }
          : null,
    };
  });

  const acquiredTicks = tickPositions(topPlotHeight, scale, "up");
  const disposedTicks = tickPositions(bottomPlotHeight, scale, "down");

  return {
    bars,
    acquiredTicks,
    disposedTicks,
    plotTop,
    plotBottom,
    plotLeft,
    plotRight,
    zeroY: DIVERGING_ZERO_Y,
  };
}
