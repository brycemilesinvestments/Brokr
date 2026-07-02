export type FredSeriesRow = {
  series_id: string;
  name: string;
  category: string;
  description: string | null;
  frequency: string | null;
  units: string | null;
};

export type FredObservationRow = {
  series_id: string;
  observation_date: string;
  value: number;
};

export type FredTimelineEvent = {
  id: string;
  seriesId: string;
  name: string;
  category: string;
  observationDate: string;
  value: number;
  units: string | null;
  frequency: string | null;
};

export type FredTimelineResponse = {
  events: FredTimelineEvent[];
  from: string;
  to: string;
  seriesCount: number;
};

export type FredStatus = {
  schemaReady: boolean;
  schemaError?: string;
  targetSeriesCount: number;
  seriesCount: number;
  observationCount: number;
  latestObservationDate: string | null;
  completedSeriesCount: number;
  failedSeries: string[];
  inProgressSeries: string | null;
  lastIngestedAt: string | null;
  fredApiKeyConfigured: boolean;
};

export type FredIngestResult = {
  totalSeries: number;
  ingestedSeries: number;
  failedSeries: Array<{ seriesId: string; reason: string }>;
  seriesCount: number;
  observationCount: number;
  latestObservationDate: string | null;
  observationStart: string;
  source: "api" | "csv";
};
