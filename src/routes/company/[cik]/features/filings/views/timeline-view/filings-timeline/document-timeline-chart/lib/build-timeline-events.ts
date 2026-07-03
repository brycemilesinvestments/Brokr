import { CORE_FORM_META } from "@/lib/edgar/core-forms";
import type { FredCategory } from "@/lib/fred/constants";
import {
  CATEGORY_MARKER_COLORS,
  FRED_MARKER_COLOR,
  FRED_MARKER_COLORS,
} from "../../constants";
import type { TimelineEvent, TimelineMarker } from "../types";
import {
  computePriceImpactPercent,
  getCloseAfterTradingDays,
  getDateAfterTradingDays,
} from "./compute-price-impact";

const FRED_CATEGORY_LABELS: Partial<Record<FredCategory, string>> = {
  "Interest Rates": "Rates",
  Employment: "Employment",
  Inflation: "Inflation",
};

function markerId(marker: TimelineMarker): string {
  if (marker.kind === "filing") {
    return marker.filing.accessionNumber ?? `${marker.eventDate}-${marker.filing.type}`;
  }
  return marker.event.id;
}

function markerCategoryLabel(marker: TimelineMarker): string {
  if (marker.kind === "filing") {
    return CORE_FORM_META[marker.filing.category].label;
  }

  const category = marker.event.category as FredCategory;
  return FRED_CATEGORY_LABELS[category] ?? category;
}

function markerDescription(marker: TimelineMarker): string {
  if (marker.kind === "filing") {
    return marker.filing.description;
  }
  return marker.event.name;
}

function markerColor(marker: TimelineMarker): string {
  if (marker.kind === "filing") {
    return CATEGORY_MARKER_COLORS[marker.filing.category];
  }

  const category = marker.event.category as FredCategory;
  return FRED_MARKER_COLORS[category] ?? FRED_MARKER_COLOR;
}

export function buildChartMarkerDisplays(markers: TimelineMarker[]) {
  return markers.map((marker) => ({
    id: markerId(marker),
    time: marker.snappedDate,
    close: marker.close,
    color: markerColor(marker),
  }));
}

export function buildTimelineEvents(
  markers: TimelineMarker[],
  quoteDates: string[],
  closeByDate: Map<string, number>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const marker of markers) {
    const impactEndDate = getDateAfterTradingDays(marker.snappedDate, quoteDates);
    const futureClose = getCloseAfterTradingDays(marker.snappedDate, quoteDates, closeByDate);
    if (impactEndDate == null || futureClose == null) continue;

    const priceImpact = computePriceImpactPercent(marker.close, futureClose);

    events.push({
      id: markerId(marker),
      kind: marker.kind,
      categoryLabel: markerCategoryLabel(marker),
      eventDate: marker.eventDate,
      snappedDate: marker.snappedDate,
      impactEndDate,
      description: markerDescription(marker),
      color: markerColor(marker),
      close: marker.close,
      priceImpact,
      marker,
    });
  }

  return events;
}
