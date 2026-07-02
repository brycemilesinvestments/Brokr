"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import type { PlottedPoint } from "../lib/build-metric-chart-geometry";
import { findNearestPointIndex, getSvgX } from "../lib/chart-hover";

export type MetricChartHover = {
  index: number;
  x: number;
  point: PlottedPoint;
};

export function useMetricLineChartHover(chartPoints: PlottedPoint[]) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<MetricChartHover | null>(null);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const handleChartMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const svg = svgRef.current;
      if (!svg || chartPoints.length === 0) return;

      const svgX = getSvgX(svg, event.clientX);
      if (svgX < PADDING.left || svgX > CHART_WIDTH - PADDING.right) {
        setHover(null);
        return;
      }

      const index = findNearestPointIndex(chartPoints, svgX);
      if (index === null) return;

      const point = chartPoints[index];
      setHover({ index, x: point.plotX, point });
    },
    [chartPoints],
  );

  const handleChartMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  useEffect(() => {
    setHover(null);
  }, [chartPoints]);

  return {
    svgRef,
    hover,
    plotWidth,
    plotHeight,
    handleChartMouseMove,
    handleChartMouseLeave,
  };
}
