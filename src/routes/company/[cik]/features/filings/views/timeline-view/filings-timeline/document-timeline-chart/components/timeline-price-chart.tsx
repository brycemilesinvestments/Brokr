"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { DocumentTimelineChartRow } from "../lib/build-chart-data";
import {
  buildImpactWindowOverlayCoords,
  type ImpactWindowOverlayCoords,
} from "../lib/build-impact-window-overlay";
import type { SelectedImpactWindow } from "../types";
import { formatMarkerDate, formatPrice } from "../utils/format-price";

const PLOT_TOP_MARGIN = 0.06;
const PLOT_BOTTOM_MARGIN = 0.12;
const MARKER_SIZE_DEFAULT = 8;
const MARKER_SIZE_ACTIVE = 13;
const MARKER_STACK_GAP = 9;

type ChartMarkerDisplay = {
  id: string;
  time: string;
  close: number;
  color: string;
};

type TimelinePriceChartProps = {
  chartData: DocumentTimelineChartRow[];
  chartMarkers: ChartMarkerDisplay[];
  activeEventId: string | null;
  selectedEventId: string | null;
  selectedImpactWindow: SelectedImpactWindow | null;
  onSelectEvent: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
};

export function TimelinePriceChart({
  chartData,
  chartMarkers,
  activeEventId,
  selectedEventId,
  selectedImpactWindow,
  onSelectEvent,
  onHoverEvent,
}: TimelinePriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [chartHeight, setChartHeight] = useState(0);
  const [plotWidth, setPlotWidth] = useState(0);
  const [priceScaleWidth, setPriceScaleWidth] = useState(0);
  const [crosshairSnapshot, setCrosshairSnapshot] = useState<{
    price: number;
    date: string;
  } | null>(null);
  const [markerPositions, setMarkerPositions] = useState<
    Array<ChartMarkerDisplay & { left: number; top: number }>
  >([]);
  const [impactWindowCoords, setImpactWindowCoords] = useState<ImpactWindowOverlayCoords | null>(
    null,
  );

  const positionedMarkers = useMemo(
    () =>
      chartMarkers.map((marker) => ({
        ...marker,
        timeKey: marker.time as Time,
      })),
    [chartMarkers],
  );

  const updateMarkerPositions = useCallback(() => {
    const container = containerRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!container || !chart || !series) {
      setMarkerPositions([]);
      setImpactWindowCoords(null);
      return;
    }

    const nextHeight = container.clientHeight;
    if (nextHeight > 0) {
      setChartHeight(nextHeight);
    }

    const timeScale = chart.timeScale();
    const nextPriceScaleWidth = chart.priceScale("left").width();
    setPriceScaleWidth(nextPriceScaleWidth);
    setPlotWidth(Math.max(0, container.clientWidth - nextPriceScaleWidth));

    const nextPlotHeight = nextHeight * (1 - PLOT_BOTTOM_MARGIN) - nextHeight * PLOT_TOP_MARGIN;
    const plotBottom = nextHeight * (1 - PLOT_BOTTOM_MARGIN);

    const markersByTime = new Map<string, typeof positionedMarkers>();
    for (const marker of positionedMarkers) {
      const group = markersByTime.get(marker.time) ?? [];
      group.push(marker);
      markersByTime.set(marker.time, group);
    }

    const nextPositions: Array<ChartMarkerDisplay & { left: number; top: number }> = [];

    for (const group of markersByTime.values()) {
      group.forEach((marker, stackIndex) => {
        const x = timeScale.timeToCoordinate(marker.timeKey);
        const y = series.priceToCoordinate(marker.close);
        if (x == null || y == null) return;

        nextPositions.push({
          ...marker,
          left: nextPriceScaleWidth + x,
          top: y - stackIndex * MARKER_STACK_GAP,
        });
      });
    }

    setMarkerPositions(nextPositions);

    if (selectedImpactWindow) {
      setImpactWindowCoords(
        buildImpactWindowOverlayCoords(
          chartData,
          selectedImpactWindow.startDate,
          selectedImpactWindow.endDate,
          timeScale,
          series,
          nextPriceScaleWidth,
          plotBottom,
        ),
      );
      return;
    }

    setImpactWindowCoords(null);
  }, [positionedMarkers, chartData, selectedImpactWindow]);

  const showHoverLine = activeEventId != null && activeEventId !== selectedEventId;
  const hoveredMarkerPosition = useMemo(
    () =>
      showHoverLine
        ? (markerPositions.find((marker) => marker.id === activeEventId) ?? null)
        : null,
    [markerPositions, activeEventId, showHoverLine],
  );

  const impactTone = selectedImpactWindow
    ? selectedImpactWindow.priceImpact >= 0
      ? "positive"
      : "negative"
    : null;

  const priceOverlay = useMemo(() => {
    if (crosshairSnapshot) return crosshairSnapshot;

    const activeMarker = chartMarkers.find((marker) => marker.id === activeEventId);
    if (activeMarker) {
      return { price: activeMarker.close, date: activeMarker.time };
    }

    const latest = chartData[chartData.length - 1];
    if (latest) {
      return { price: latest.close, date: latest.date };
    }

    return null;
  }, [crosshairSnapshot, activeEventId, chartMarkers, chartData]);

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
        scaleMargins: { top: 0.06, bottom: 0.12 },
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
      lineColor: "#047857",
      topColor: "rgba(5, 150, 105, 0.14)",
      bottomColor: "rgba(5, 150, 105, 0)",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    areaSeries.setData(
      chartData.map((row) => ({
        time: row.date as Time,
        value: row.close,
      })),
    );

    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => `$${formatPrice(price)}`,
      },
    });

    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.point || param.time == null) {
        setCrosshairSnapshot(null);
        return;
      }

      const seriesData = param.seriesData.get(areaSeries);
      if (!seriesData || !("value" in seriesData) || seriesData.value == null) {
        setCrosshairSnapshot(null);
        return;
      }

      setCrosshairSnapshot({
        price: seriesData.value,
        date: String(param.time),
      });
    };

    const handleRangeChange = () => {
      updateMarkerPositions();
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    const resizeObserver = new ResizeObserver(handleRangeChange);
    resizeObserver.observe(container);
    handleRangeChange();

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [chartData, updateMarkerPositions]);

  useEffect(() => {
    updateMarkerPositions();
  }, [positionedMarkers, updateMarkerPositions]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const timeScale = chart.timeScale();

    if (!selectedEventId) {
      timeScale.fitContent();
      requestAnimationFrame(() => updateMarkerPositions());
      return;
    }

    const marker = chartMarkers.find((item) => item.id === selectedEventId);
    if (!marker) return;

    const startIndex = chartData.findIndex((row) => row.date === marker.time);
    if (startIndex === -1) return;

    const endDate = selectedImpactWindow?.endDate ?? marker.time;
    const endIndex = chartData.findIndex((row) => row.date === endDate);
    const resolvedEndIndex = endIndex === -1 ? startIndex : endIndex;

    const windowSpan = Math.max(resolvedEndIndex - startIndex, 8);
    const padding = Math.max(Math.round(windowSpan * 0.35), 6);
    const from = startIndex - padding;
    const to = resolvedEndIndex + padding;

    timeScale.setVisibleLogicalRange({ from, to });
    requestAnimationFrame(() => updateMarkerPositions());
  }, [selectedEventId, selectedImpactWindow, chartMarkers, chartData, updateMarkerPositions]);

  const plotTop = chartHeight * PLOT_TOP_MARGIN;
  const plotHeight = chartHeight * (1 - PLOT_BOTTOM_MARGIN) - plotTop;

  return (
    <div className="relative h-full min-h-[200px] overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {priceOverlay ? (
        <div
          className="pointer-events-none absolute z-20 rounded-md bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ left: priceScaleWidth + 8, top: plotTop + 6 }}
        >
          <div className="font-mono text-[17px] font-semibold leading-none text-zinc-900">
            ${formatPrice(priceOverlay.price)}
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-400">
            {formatMarkerDate(priceOverlay.date)}
          </div>
        </div>
      ) : null}

      {impactWindowCoords && impactTone ? (
        <>
          {impactWindowCoords.areaPath ? (
            <svg
              className="pointer-events-none absolute z-[4]"
              style={{
                left: priceScaleWidth,
                top: 0,
                width: plotWidth,
                height: chartHeight,
                overflow: "hidden",
              }}
              aria-hidden
            >
              <path
                d={impactWindowCoords.areaPath}
                fill={
                  impactTone === "positive"
                    ? "rgba(5, 150, 105, 0.16)"
                    : "rgba(220, 38, 38, 0.14)"
                }
              />
            </svg>
          ) : null}

          <div
            className="pointer-events-none absolute z-[5] -translate-x-1/2 border-l border-dashed border-zinc-900/45"
            style={{
              left: impactWindowCoords.startX,
              top: plotTop,
              height: plotHeight,
            }}
          />
          <div
            className="pointer-events-none absolute z-[5] -translate-x-1/2 border-l border-dashed border-zinc-900/45"
            style={{
              left: impactWindowCoords.endX,
              top: plotTop,
              height: plotHeight,
            }}
          />
        </>
      ) : null}

      {hoveredMarkerPosition ? (
        <div
          className="pointer-events-none absolute z-[5] -translate-x-1/2 border-l border-dashed border-zinc-900/40"
          style={{
            left: hoveredMarkerPosition.left,
            top: plotTop,
            height: plotHeight,
          }}
        />
      ) : null}

      {markerPositions.map((marker) => {
        const isActive = activeEventId === marker.id;
        const size = isActive ? MARKER_SIZE_ACTIVE : MARKER_SIZE_DEFAULT;

        return (
          <button
            key={marker.id}
            type="button"
            aria-label="Timeline event"
            onClick={() => onSelectEvent(marker.id)}
            onMouseEnter={() => onHoverEvent(marker.id)}
            onMouseLeave={() => onHoverEvent(null)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white transition-[width,height,opacity] duration-150"
            style={{
              left: marker.left,
              top: marker.top,
              width: size,
              height: size,
              backgroundColor: marker.color,
              opacity: isActive ? 1 : 0.32,
            }}
          />
        );
      })}
    </div>
  );
}
