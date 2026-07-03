import type { FredSeriesRow } from "@/lib/fred/types";

export type FredSeriesCatalogResponse = {
  series: FredSeriesRow[];
};

export type FredSeriesObservationsResponse = {
  series: FredSeriesRow;
  observations: Array<{
    series_id: string;
    observation_date: string;
    value: number;
  }>;
  from: string;
  to: string;
};

export type FredChartRow = {
  date: string;
  value: number;
};
