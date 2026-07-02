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
