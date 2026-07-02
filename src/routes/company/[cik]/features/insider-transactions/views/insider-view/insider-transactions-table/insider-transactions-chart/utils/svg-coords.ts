import { CHART_WIDTH } from "../constants";
import type { ChartGeometry, SnapPoint } from "../types";

export function getSvgX(svg: SVGSVGElement, clientX: number): number {
  const rect = svg.getBoundingClientRect();
  return ((clientX - rect.left) / rect.width) * CHART_WIDTH;
}

export function findNearestSnap(snapPoints: SnapPoint[], svgX: number): SnapPoint | null {
  if (snapPoints.length === 0) return null;

  return snapPoints.reduce((nearest, point) =>
    Math.abs(point.x - svgX) < Math.abs(nearest.x - svgX) ? point : nearest,
  );
}

export function findLineValueAtSnap(
  line: ChartGeometry["lines"][number],
  snap: SnapPoint,
): { value: number; y: number } | null {
  const exact = line.chartPoints.find((point) => point.time === snap.time);
  if (exact) return { value: exact.value, y: exact.y };

  const closest = line.chartPoints.reduce<(typeof line.chartPoints)[number] | null>(
    (best, point) => {
      if (!best) return point;
      return Math.abs(point.time - snap.time) < Math.abs(best.time - snap.time)
        ? point
        : best;
    },
    null,
  );

  if (!closest) return null;
  return { value: closest.value, y: closest.y };
}
