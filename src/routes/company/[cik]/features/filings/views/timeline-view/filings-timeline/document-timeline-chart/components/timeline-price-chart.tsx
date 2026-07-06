"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, type Ref } from "react";
import type { DocumentTimelineChartRow } from "../lib/build-chart-data";
import type { SelectedImpactWindow } from "../types";
import {
  TimelinePriceChartOverlays,
  type ChartMarkerDisplay,
} from "./timeline-price-chart-overlays";
import { useTimelinePriceChart } from "../hooks/use-timeline-price-chart";

type TimelinePriceChartProps = {
  ref?: Ref<TimelinePriceChartHandle>;
  chartData: DocumentTimelineChartRow[];
  chartMarkers: ChartMarkerDisplay[];
  activeEventId: string | null;
  selectedEventId: string | null;
  selectedImpactWindow: SelectedImpactWindow | null;
  onSelectEvent: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
};

export type TimelinePriceChartHandle = {
  zoomToEvent: (eventId: string | null) => void;
};

export function TimelinePriceChart({
  ref,
  chartData,
  chartMarkers,
  activeEventId,
  selectedEventId,
  selectedImpactWindow,
  onSelectEvent,
  onHoverEvent,
}: TimelinePriceChartProps) {
  const {
    containerRef,
    chartHeight,
    plotWidth,
    priceScaleWidth,
    plotTop,
    plotHeight,
    markerPositions,
    impactWindowCoords,
    crosshairSnapshot,
    applyEventZoom,
  } = useTimelinePriceChart({
    chartData,
    chartMarkers,
    selectedImpactWindow,
  });

  const zoomRef = useRef(applyEventZoom);
  zoomRef.current = applyEventZoom;

  useLayoutEffect(() => {
    if (!ref) return;
    const handle: TimelinePriceChartHandle = {
      zoomToEvent: (eventId) => zoomRef.current(eventId),
    };
    if (typeof ref === "function") {
      ref(handle);
      return;
    }
    ref.current = handle;
  }, [ref]);

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      onSelectEvent(eventId);
      applyEventZoom(eventId);
    },
    [applyEventZoom, onSelectEvent],
  );

  const showHoverLine = activeEventId != null && activeEventId !== selectedEventId;
  const hoveredMarkerPosition = useMemo(
    () =>
      showHoverLine
        ? (markerPositions.find((marker) => marker.id === activeEventId) ?? null)
        : null,
    [markerPositions, activeEventId, showHoverLine],
  );

  const impactTone = selectedImpactWindow
    ? selectedImpactWindow.priceImpact >= 0
      ? "positive"
      : "negative"
    : null;

  const priceOverlay = useMemo(() => {
    if (crosshairSnapshot) return crosshairSnapshot;

    const activeMarker = chartMarkers.find((marker) => marker.id === activeEventId);
    if (activeMarker) {
      return { price: activeMarker.close, date: activeMarker.time };
    }

    const latest = chartData[chartData.length - 1];
    if (latest) {
      return { price: latest.close, date: latest.date };
    }

    return null;
  }, [crosshairSnapshot, activeEventId, chartMarkers, chartData]);

  return (
    <div className="relative h-full min-h-[200px] overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      <TimelinePriceChartOverlays
        chartHeight={chartHeight}
        plotWidth={plotWidth}
        priceScaleWidth={priceScaleWidth}
        plotTop={plotTop}
        plotHeight={plotHeight}
        priceOverlay={priceOverlay}
        impactWindowCoords={impactWindowCoords}
        impactTone={impactTone}
        hoveredMarkerPosition={hoveredMarkerPosition}
        markerPositions={markerPositions}
        activeEventId={activeEventId}
        onSelectEvent={handleSelectEvent}
        onHoverEvent={onHoverEvent}
      />
    </div>
  );
}
