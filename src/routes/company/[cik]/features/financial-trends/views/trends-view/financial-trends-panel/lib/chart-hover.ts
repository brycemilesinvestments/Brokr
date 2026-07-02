import { CHART_WIDTH } from "../constants";
import type { PlottedPoint } from "./build-metric-chart-geometry";

export function getSvgX(svg: SVGSVGElement, clientX: number): number {
  const rect = svg.getBoundingClientRect();
  return ((clientX - rect.left) / rect.width) * CHART_WIDTH;
}

export function findNearestPointIndex(points: PlottedPoint[], svgX: number): number | null {
  if (points.length === 0) return null;

  let bestIndex = 0;
  let bestDistance = Math.abs(points[0].plotX - svgX);

  for (let i = 1; i < points.length; i++) {
    const distance = Math.abs(points[i].plotX - svgX);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}
