import type { FredObservationRow, FredSeriesRow, FredTimelineEvent } from "./types";

function isHighFrequency(frequency: string | null): boolean {
  if (!frequency) return false;
  const normalized = frequency.toLowerCase();
  return normalized.includes("daily") || normalized.includes("weekly");
}

function bucketKey(observationDate: string, frequency: string | null): string {
  if (isHighFrequency(frequency)) {
    return observationDate.slice(0, 7);
  }
  return observationDate;
}

/**
 * Collapse high-frequency series to one event per month; keep each point for
 * monthly, quarterly, and annual releases.
 */
export function buildFredTimelineEvents(
  seriesById: Map<string, FredSeriesRow>,
  observations: FredObservationRow[],
): FredTimelineEvent[] {
  const latestInBucket = new Map<string, FredObservationRow>();

  for (const observation of observations) {
    const series = seriesById.get(observation.series_id);
    if (!series) continue;

    const key = `${observation.series_id}:${bucketKey(observation.observation_date, series.frequency)}`;
    const existing = latestInBucket.get(key);
    if (!existing || existing.observation_date < observation.observation_date) {
      latestInBucket.set(key, observation);
    }
  }

  const events: FredTimelineEvent[] = [];

  for (const observation of latestInBucket.values()) {
    const series = seriesById.get(observation.series_id);
    if (!series) continue;

    events.push({
      id: `${observation.series_id}:${observation.observation_date}`,
      seriesId: observation.series_id,
      name: series.name,
      category: series.category,
      observationDate: observation.observation_date,
      value: observation.value,
      units: series.units,
      frequency: series.frequency,
    });
  }

  return events.sort((a, b) => b.observationDate.localeCompare(a.observationDate));
}
