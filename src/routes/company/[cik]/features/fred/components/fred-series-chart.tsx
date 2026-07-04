"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { formatFredValue } from "@/lib/fred";
import type { FredSeriesRow } from "@/lib/fred/types";
import type { FredChartRow } from "../types";

const PLOT_TOP_MARGIN = 0.06;
const PLOT_BOTTOM_MARGIN = 0.12;

type FredSeriesChartProps = {
  series: FredSeriesRow;
  chartData: FredChartRow[];
  lineColor: string;
};

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FredSeriesChart({ series, chartData, lineColor }: FredSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#b4b4bb",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 9,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#f4f4f5" },
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
        vertLine: { color: "#d4d4d8", width: 1, style: 2, labelVisible: false },
        horzLine: { color: "#d4d4d8", width: 1, style: 2, labelBackgroundColor: "#27272a" },
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
      lineColor,
      topColor: withAlpha(lineColor, 0.09),
      bottomColor: withAlpha(lineColor, 0),
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatFredValue(price, series.units),
      },
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [lineColor, series.units]);

  useEffect(() => {
    const chart = chartRef.current;
    const areaSeries = seriesRef.current;
    if (!chart || !areaSeries) return;

    areaSeries.setData(
      chartData.map((row) => ({
        time: row.date as Time,
        value: row.value,
      })),
    );

    chart.timeScale().fitContent();
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">
        No observations for this series in the selected range.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[200px] overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
