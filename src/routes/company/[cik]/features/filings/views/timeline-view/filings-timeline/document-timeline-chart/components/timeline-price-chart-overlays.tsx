import type { ImpactWindowOverlayCoords } from "../lib/build-impact-window-overlay";
import { formatMarkerDate, formatPrice } from "../utils/format-price";

type ChartMarkerDisplay = {
  id: string;
  time: string;
  close: number;
  color: string;
};

type TimelinePriceChartOverlaysProps = {
  chartHeight: number;
  plotWidth: number;
  priceScaleWidth: number;
  plotTop: number;
  plotHeight: number;
  priceOverlay: { price: number; date: string } | null;
  impactWindowCoords: ImpactWindowOverlayCoords | null;
  impactTone: "positive" | "negative" | null;
  hoveredMarkerPosition: (ChartMarkerDisplay & { left: number; top: number }) | null;
  markerPositions: Array<ChartMarkerDisplay & { left: number; top: number }>;
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
};

const MARKER_SIZE_DEFAULT = 8;
const MARKER_SIZE_ACTIVE = 13;

export function TimelinePriceChartOverlays({
  chartHeight,
  plotWidth,
  priceScaleWidth,
  plotTop,
  plotHeight,
  priceOverlay,
  impactWindowCoords,
  impactTone,
  hoveredMarkerPosition,
  markerPositions,
  activeEventId,
  onSelectEvent,
  onHoverEvent,
}: TimelinePriceChartOverlaysProps) {
  return (
    <>
      {priceOverlay ? (
        <div
          className="pointer-events-none absolute z-20 rounded-md bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
          style={{ left: priceScaleWidth + 8, top: plotTop + 6 }}
        >
          <div className="font-mono text-[17px] font-semibold leading-none text-zinc-900">
            ${formatPrice(priceOverlay.price)}
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-400">
            {formatMarkerDate(priceOverlay.date)}
          </div>
        </div>
      ) : null}

      {impactWindowCoords && impactTone ? (
        <>
          {impactWindowCoords.areaPath ? (
            <svg
              className="pointer-events-none absolute z-[4]"
              style={{
                left: priceScaleWidth,
                top: 0,
                width: plotWidth,
                height: chartHeight,
                overflow: "hidden",
              }}
              aria-hidden
            >
              <path
                d={impactWindowCoords.areaPath}
                fill={
                  impactTone === "positive"
                    ? "rgba(5, 150, 105, 0.16)"
                    : "rgba(220, 38, 38, 0.14)"
                }
              />
            </svg>
          ) : null}

          <div
            className="pointer-events-none absolute z-[5] -translate-x-1/2 border-l border-dashed border-zinc-900/45"
            style={{
              left: impactWindowCoords.startX,
              top: plotTop,
              height: plotHeight,
            }}
          />
          <div
            className="pointer-events-none absolute z-[5] -translate-x-1/2 border-l border-dashed border-zinc-900/45"
            style={{
              left: impactWindowCoords.endX,
              top: plotTop,
              height: plotHeight,
            }}
          />
        </>
      ) : null}

      {hoveredMarkerPosition ? (
        <div
          className="pointer-events-none absolute z-[5] -translate-x-1/2 border-l border-dashed border-zinc-900/40"
          style={{
            left: hoveredMarkerPosition.left,
            top: plotTop,
            height: plotHeight,
          }}
        />
      ) : null}

      {markerPositions.map((marker) => {
        const isActive = activeEventId === marker.id;
        const size = isActive ? MARKER_SIZE_ACTIVE : MARKER_SIZE_DEFAULT;

        return (
          <button
            key={marker.id}
            type="button"
            aria-label="Timeline event"
            onClick={() => onSelectEvent(marker.id)}
            onMouseEnter={() => onHoverEvent(marker.id)}
            onMouseLeave={() => onHoverEvent(null)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white transition-[width,height,opacity] duration-150"
            style={{
              left: marker.left,
              top: marker.top,
              width: size,
              height: size,
              backgroundColor: marker.color,
              opacity: isActive ? 1 : 0.32,
            }}
          />
        );
      })}
    </>
  );
}

export type { ChartMarkerDisplay };
