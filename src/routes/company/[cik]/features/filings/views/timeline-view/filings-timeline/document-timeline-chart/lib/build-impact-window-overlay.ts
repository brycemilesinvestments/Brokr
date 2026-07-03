import type { ISeriesApi, ITimeScaleApi, Time } from "lightweight-charts";
import type { DocumentTimelineChartRow } from "./build-chart-data";

export type ImpactWindowOverlayCoords = {
  startX: number;
  endX: number;
  areaPath: string;
};

export function buildImpactWindowOverlayCoords(
  chartData: DocumentTimelineChartRow[],
  startDate: string,
  endDate: string,
  timeScale: ITimeScaleApi<Time>,
  series: ISeriesApi<"Area">,
  priceScaleWidth: number,
  plotBottom: number,
): ImpactWindowOverlayCoords | null {
  const startXRel = timeScale.timeToCoordinate(startDate as Time);
  const endXRel = timeScale.timeToCoordinate(endDate as Time);
  if (startXRel == null || endXRel == null) return null;

  const windowData = chartData.filter(
    (row) => row.date >= startDate && row.date <= endDate,
  );
  if (windowData.length < 2) {
    return {
      startX: priceScaleWidth + startXRel,
      endX: priceScaleWidth + endXRel,
      areaPath: "",
    };
  }

  const coords: Array<{ x: number; y: number }> = [];
  for (const row of windowData) {
    const x = timeScale.timeToCoordinate(row.date as Time);
    const y = series.priceToCoordinate(row.close);
    if (x == null || y == null) continue;
    coords.push({ x, y });
  }

  if (coords.length < 2) {
    return {
      startX: priceScaleWidth + startXRel,
      endX: priceScaleWidth + endXRel,
      areaPath: "",
    };
  }

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let index = 1; index < coords.length; index += 1) {
    linePath += ` L ${coords[index].x} ${coords[index].y}`;
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L ${last.x} ${plotBottom} L ${first.x} ${plotBottom} Z`;

  return {
    startX: priceScaleWidth + startXRel,
    endX: priceScaleWidth + endXRel,
    areaPath,
  };
}
