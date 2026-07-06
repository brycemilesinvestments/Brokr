"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { MetricChartRow } from "../lib/build-metric-chart-geometry";
import { prepareMetricTradingViewData } from "../lib/prepare-metric-tradingview-data";
import { formatAxisDate, formatMetricValue } from "../utils/format-metric";

const PLOT_TOP_MARGIN = 0.06;
const PLOT_BOTTOM_MARGIN = 0.12;
const LINE_COLOR = "#52525b";

type TooltipPosition = {
  x: number;
  y: number;
};

type MetricTradingViewChartProps = {
  metric: string;
  chartData: MetricChartRow[];
  pinnedPoint?: MetricChartRow | null;
  onPinnedPointChange?: (point: MetricChartRow | null) => void;
  onHoverPointChange?: (point: MetricChartRow | null) => void;
  documentHref?: string;
  className?: string;
};

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pointFromCrosshair(
  rowsByDate: Map<string, MetricChartRow>,
  time: Time | undefined,
): MetricChartRow | null {
  if (!time) return null;
  return rowsByDate.get(String(time)) ?? null;
}

function PinnedPointTooltip({
  metric,
  point,
  documentHref,
  position,
}: {
  metric: string;
  point: MetricChartRow;
  documentHref?: string;
  position: TooltipPosition;
}) {
  return (
    <div
      className="pointer-events-auto absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="min-w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-zinc-500">
          {formatAxisDate(point.date)} · {point.frequency}
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">
          {formatMetricValue(metric, point.value)}
        </p>
        {documentHref ? (
          <Link
            href={documentHref}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Open filing
          </Link>
        ) : (
          <p className="mt-2 text-center text-[11px] text-zinc-400">Filing not found</p>
        )}
      </div>
    </div>
  );
}

export function MetricTradingViewChart({
  metric,
  chartData,
  pinnedPoint = null,
  onPinnedPointChange,
  onHoverPointChange,
  documentHref,
  className,
}: MetricTradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const rowsByDateRef = useRef<Map<string, MetricChartRow> | null>(null);
  const pinnedPointRef = useRef(pinnedPoint);
  const onPinnedPointChangeRef = useRef(onPinnedPointChange);
  const onHoverPointChangeRef = useRef(onHoverPointChange);
  const [tooltipAnchor, setTooltipAnchor] = useState<{
    date: string;
    position: TooltipPosition;
  } | null>(null);
  const tooltipPosition =
    pinnedPoint && tooltipAnchor?.date === pinnedPoint.date ? tooltipAnchor.position : null;

  function getRowsByDateMap() {
    if (!rowsByDateRef.current) {
      rowsByDateRef.current = new Map();
    }
    return rowsByDateRef.current;
  }

  pinnedPointRef.current = pinnedPoint;
  onPinnedPointChangeRef.current = onPinnedPointChange;
  onHoverPointChangeRef.current = onHoverPointChange;

  const syncPinnedCrosshair = useCallback(() => {
    const chart = chartRef.current;
    const areaSeries = seriesRef.current;
    const pinned = pinnedPointRef.current;
    if (!chart || !areaSeries || !pinned) return;

    chart.setCrosshairPosition(pinned.value, pinned.date as Time, areaSeries);
  }, []);

  const updateTooltipPosition = useCallback(() => {
    const chart = chartRef.current;
    const areaSeries = seriesRef.current;
    const pinned = pinnedPointRef.current;
    if (!chart || !areaSeries || !pinned) {
      setTooltipAnchor(null);
      return;
    }

    const x = chart.timeScale().timeToCoordinate(pinned.date as Time);
    const y = areaSeries.priceToCoordinate(pinned.value);
    if (x === null || y === null) {
      setTooltipAnchor(null);
      return;
    }

    setTooltipAnchor({ date: pinned.date, position: { x, y } });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 9.5,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#f1f1f2" },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: {
        borderVisible: false,
        scaleMargins: { top: PLOT_TOP_MARGIN, bottom: PLOT_BOTTOM_MARGIN },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#a1a1aa", width: 1, style: 2, labelVisible: false },
        horzLine: { color: "#a1a1aa", width: 1, style: 2, labelBackgroundColor: "#27272a" },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: LINE_COLOR,
      topColor: withAlpha(LINE_COLOR, 0.1),
      bottomColor: withAlpha(LINE_COLOR, 0),
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      const pinned = pinnedPointRef.current;
      if (pinned) {
        chart.setCrosshairPosition(pinned.value, pinned.date as Time, areaSeries);
        return;
      }

      if (!param.time) {
        onHoverPointChangeRef.current?.(null);
        return;
      }

      onHoverPointChangeRef.current?.(
        pointFromCrosshair(getRowsByDateMap(), param.time),
      );
    };

    const handleClick = (param: MouseEventParams<Time>) => {
      if (!param.time) {
        onPinnedPointChangeRef.current?.(null);
        chart.clearCrosshairPosition();
        return;
      }

      const point = pointFromCrosshair(getRowsByDateMap(), param.time);
      if (!point) return;

      onPinnedPointChangeRef.current?.(point);
      chart.setCrosshairPosition(point.value, param.time, areaSeries);
      syncPinnedCrosshair();
      updateTooltipPosition();
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);

    const prepared = prepareMetricTradingViewData(chartData);
    const rowsByDate = getRowsByDateMap();
    rowsByDate.clear();
    for (const [key, value] of prepared.rowsByDate.entries()) {
      rowsByDate.set(key, value);
    }
    areaSeries.setData(prepared.seriesData);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      updateTooltipPosition();
    });
    resizeObserver.observe(container);

    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = () => {
      updateTooltipPosition();
    };
    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    if (pinnedPointRef.current) {
      chart.setCrosshairPosition(
        pinnedPointRef.current.value,
        pinnedPointRef.current.date as Time,
        areaSeries,
      );
      updateTooltipPosition();
    }

    return () => {
      resizeObserver.disconnect();
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [metric, chartData, updateTooltipPosition, syncPinnedCrosshair]);

  useEffect(() => {
    const chart = chartRef.current;
    const areaSeries = seriesRef.current;
    if (!chart || !areaSeries) return;

    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatMetricValue(metric, price),
      },
    });
  }, [metric]);

  if (chartData.length === 0) {
    return (
      <div
        className={`flex h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500 ${className ?? ""}`}
      >
        No data points for this metric and frequency.
      </div>
    );
  }

  return (
    <div className={`relative h-[280px] overflow-hidden ${className ?? ""}`}>
      <div ref={containerRef} className="h-full w-full" />
      {pinnedPoint && tooltipPosition ? (
        <PinnedPointTooltip
          metric={metric}
          point={pinnedPoint}
          documentHref={documentHref}
          position={tooltipPosition}
        />
      ) : null}
    </div>
  );
}
