import { describe, expect, it } from "vitest";
import { buildFredTimelineEvents } from "@/lib/fred/build-timeline-events";
import type { FredObservationRow, FredSeriesRow } from "@/lib/fred/types";

const seriesById = new Map<string, FredSeriesRow>([
  [
    "UNRATE",
    {
      series_id: "UNRATE",
      name: "Unemployment Rate",
      category: "Employment",
      description: "Unemployment rate",
      frequency: "Monthly",
      units: "Percent",
    },
  ],
  [
    "DGS10",
    {
      series_id: "DGS10",
      name: "10-Year Treasury",
      category: "Interest Rates",
      description: "10-year treasury yield",
      frequency: "Daily",
      units: "Percent",
    },
  ],
]);

describe("buildFredTimelineEvents", () => {
  it("keeps each monthly observation as its own event", () => {
    const observations: FredObservationRow[] = [
      { series_id: "UNRATE", observation_date: "2024-01-01", value: 3.7 },
      { series_id: "UNRATE", observation_date: "2024-02-01", value: 3.8 },
    ];

    const events = buildFredTimelineEvents(seriesById, observations);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.observationDate)).toEqual(["2024-02-01", "2024-01-01"]);
  });

  it("collapses daily observations to one event per month", () => {
    const observations: FredObservationRow[] = [
      { series_id: "DGS10", observation_date: "2024-01-02", value: 4.0 },
      { series_id: "DGS10", observation_date: "2024-01-15", value: 4.1 },
      { series_id: "DGS10", observation_date: "2024-01-31", value: 4.2 },
    ];

    const events = buildFredTimelineEvents(seriesById, observations);
    expect(events).toHaveLength(1);
    expect(events[0]?.observationDate).toBe("2024-01-31");
    expect(events[0]?.value).toBe(4.2);
  });
});
