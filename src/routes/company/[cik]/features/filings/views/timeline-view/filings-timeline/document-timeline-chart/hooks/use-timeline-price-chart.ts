"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
import type { ChartMarkerDisplay } from "../components/timeline-price-chart-overlays";
import { formatPrice } from "../utils/format-price";

const PLOT_TOP_MARGIN = 0.06;
const PLOT_BOTTOM_MARGIN = 0.12;
const MARKER_STACK_GAP = 9;

type UseTimelinePriceChartOptions = {
  chartData: DocumentTimelineChartRow[];
  chartMarkers: ChartMarkerDisplay[];
  selectedImpactWindow: SelectedImpactWindow | null;
};

export function useTimelinePriceChart({
  chartData,
  chartMarkers,
  selectedImpactWindow,
}: UseTimelinePriceChartOptions) {
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

  const syncMarkerPositions = useEffectEvent(() => {
    updateMarkerPositions();
  });

  const applyEventZoom = useCallback(
    (eventId: string | null) => {
      const chart = chartRef.current;
      if (!chart) return;

      const timeScale = chart.timeScale();

      if (!eventId) {
        timeScale.fitContent();
        requestAnimationFrame(() => updateMarkerPositions());
        return;
      }

      const marker = chartMarkers.find((item) => item.id === eventId);
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
    },
    [chartMarkers, chartData, selectedImpactWindow, updateMarkerPositions],
  );

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
      syncMarkerPositions();
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
  }, [chartData, positionedMarkers, selectedImpactWindow]);

  const plotTop = chartHeight * PLOT_TOP_MARGIN;
  const plotHeight = chartHeight * (1 - PLOT_BOTTOM_MARGIN) - plotTop;

  return {
    containerRef,
    chartHeight,
    plotWidth,
    priceScaleWidth,
    plotTop,
    plotHeight,
    markerPositions,
    impactWindowCoords,
    crosshairSnapshot,
    applyEventZoom,
  };
}
