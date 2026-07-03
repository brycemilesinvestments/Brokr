"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatFredValue } from "@/lib/fred";
import type { FredSeriesRow } from "@/lib/fred/types";
import type { FredChartRow } from "../types";
import { formatFredAxisDate } from "../utils/format-fred-chart";

const LINE_COLOR = "#4f46e5";
const PLOT_TOP_MARGIN = 0.06;
const PLOT_BOTTOM_MARGIN = 0.12;

type FredSeriesChartProps = {
  series: FredSeriesRow;
  chartData: FredChartRow[];
};

export function FredSeriesChart({ series, chartData }: FredSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [priceScaleWidth, setPriceScaleWidth] = useState(0);
  const [crosshairSnapshot, setCrosshairSnapshot] = useState<{
    value: number;
    date: string;
  } | null>(null);

  const valueOverlay = useMemo(() => {
    if (crosshairSnapshot) return crosshairSnapshot;

    const latest = chartData[chartData.length - 1];
    if (latest) {
      return { value: latest.value, date: latest.date };
    }

    return null;
  }, [crosshairSnapshot, chartData]);

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
      topColor: "rgba(79, 70, 229, 0.14)",
      bottomColor: "rgba(79, 70, 229, 0)",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
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
        value: seriesData.value,
        date: String(param.time),
      });
    };

    const handleRangeChange = () => {
      setPriceScaleWidth(chart.priceScale("left").width());
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
  }, [series.units]);

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
    setPriceScaleWidth(chart.priceScale("left").width());
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

      {valueOverlay ? (
        <div
          className="pointer-events-none absolute z-20 rounded-md bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ left: priceScaleWidth + 8, top: "6%" }}
        >
          <div className="font-mono text-[17px] font-semibold leading-none text-zinc-900">
            {formatFredValue(valueOverlay.value, series.units)}
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-400">
            {formatFredAxisDate(valueOverlay.date)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
