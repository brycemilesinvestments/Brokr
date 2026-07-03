import {
  DIVERGING_CHART_HEIGHT,
  DIVERGING_CHART_WIDTH,
  DIVERGING_COLORS,
  DIVERGING_PADDING,
  DIVERGING_ZERO_Y,
} from "../constants";
import type { MonthlyVolumeBucket } from "./build-monthly-volume";

export type DivergingBarGeometry = {
  monthKey: string;
  label: string;
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

const MIN_LOG_VALUE = 10_000;
const MAX_LOG_VALUE = 1_000_000;

function logHeight(value: number, plotHeight: number): number {
  if (value <= 0) return 0;

  const minLog = Math.log10(MIN_LOG_VALUE);
  const maxLog = Math.log10(MAX_LOG_VALUE);
  const logValue = Math.log10(Math.max(value, MIN_LOG_VALUE));
  const clamped = Math.min(maxLog, Math.max(minLog, logValue));

  return ((clamped - minLog) / (maxLog - minLog)) * plotHeight;
}

function tickPositions(plotHeight: number): Array<{ y: number; label: string }> {
  const minLog = Math.log10(MIN_LOG_VALUE);
  const maxLog = Math.log10(MAX_LOG_VALUE);
  const ticks = [MIN_LOG_VALUE, 100_000, MAX_LOG_VALUE];

  return ticks.map((value) => {
    const logValue = Math.log10(value);
    const offset = ((logValue - minLog) / (maxLog - minLog)) * plotHeight;
    return {
      y: DIVERGING_ZERO_Y - offset,
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

  const bars = buckets.map((bucket, index) => {
    const centerX = plotLeft + (index + 0.5) * slotWidth;
    const barX = centerX - barWidth / 2;
    const acquiredHeight = logHeight(bucket.acquired, topPlotHeight);
    const disposedHeight = logHeight(bucket.disposed, bottomPlotHeight);

    return {
      monthKey: bucket.monthKey,
      label: bucket.label,
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

  const acquiredTicks = tickPositions(topPlotHeight);
  const disposedTicks = [MIN_LOG_VALUE, 100_000, MAX_LOG_VALUE].map((value) => {
    const minLog = Math.log10(MIN_LOG_VALUE);
    const maxLog = Math.log10(MAX_LOG_VALUE);
    const logValue = Math.log10(value);
    const offset = ((logValue - minLog) / (maxLog - minLog)) * bottomPlotHeight;
    return {
      y: DIVERGING_ZERO_Y + offset,
      label: value >= 1_000_000 ? "1.00M" : formatTickLabel(value),
    };
  });

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

export { DIVERGING_COLORS };
