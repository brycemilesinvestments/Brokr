import type { DivergenceFlag, PeerComparisonBundle } from "@/lib/peers/types";
import { PEER_DISPLAY_METRICS } from "@/routes/company/[cik]/features/peers/types";
import {
  buildPeerChips,
  buildPeerColorByCik,
} from "@/routes/company/[cik]/features/peers/lib/build-peer-chips";
import {
  formatMetricLabel,
  formatPeerMetricValue,
} from "@/routes/company/[cik]/features/peers/utils/format-peer-metric";
import { getPercentileTone } from "@/routes/company/[cik]/features/peers/utils/get-percentile-tone";

export type PeerMarkerModel = {
  ticker: string;
  position: number;
  barColorClass: string;
};

export type PeerMetricRowModel = {
  metricKey: string;
  label: string;
  calendarKey: string;
  peerCount: number;
  /** Percentile rank vs peers (subtitle). */
  rank: number;
  /** Target position on the value scale (bar dot). */
  targetPosition: number;
  scaleMin: number;
  scaleMax: number;
  zeroPosition: number | null;
  tone: ReturnType<typeof getPercentileTone>;
  targetValue: number;
  medianValue: number;
  targetFormatted: string;
  medianFormatted: string;
  scaleMinFormatted: string;
  scaleMaxFormatted: string;
  divergenceTitle: string | null;
  peerMarkers: PeerMarkerModel[];
};

function distributionPercentile(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const below = values.filter((entry) => entry < value).length;
  return Math.round((below / values.length) * 100);
}

/** Map a metric value onto 0–100 using the observed min/max (supports negative ranges). */
function valueScalePosition(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

/** Position of zero on the value scale, when the range crosses zero. */
function zeroScalePosition(min: number, max: number): number | null {
  if (min >= 0 || max <= 0) return null;
  return valueScalePosition(0, min, max);
}

function medianValue(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function divergenceTitle(
  metricKey: string,
  divergences: DivergenceFlag[],
  calendarKey: string,
): string | null {
  const flag = divergences.find(
    (entry) => entry.metricKey === metricKey && entry.calendarKey === calendarKey,
  );
  if (!flag) return null;
  return `Diverging: target ${flag.targetTrend} while peers ${flag.peerMedianTrend}`;
}

export function buildPeerMetricRows(
  bundle: PeerComparisonBundle,
  targetTicker?: string,
  selectedPeerCiks?: ReadonlySet<string>,
): {
  rows: PeerMetricRowModel[];
  calendarKey: string;
} {
  const peerColorByCik = buildPeerColorByCik(buildPeerChips(bundle, targetTicker));
  const seriesByKey = new Map(
    bundle.relativeMetrics.map((entry) => [entry.metricKey, entry] as const),
  );
  const rows: PeerMetricRowModel[] = [];
  let calendarKey = "";

  for (const metricKey of PEER_DISPLAY_METRICS) {
    const series = seriesByKey.get(metricKey);
    if (!series) continue;

    const comparableBand = [...series.peerBand]
      .reverse()
      .find((band) => band.peerCount >= 2 && band.median !== null);
    const targetAtPeriod = comparableBand
      ? series.target.find((point) => point.calendarKey === comparableBand.calendarKey)
      : undefined;
    const comparablePct = comparableBand
      ? series.percentileRank.find((point) => point.calendarKey === comparableBand.calendarKey)
      : undefined;

    if (
      !targetAtPeriod ||
      !comparableBand ||
      comparablePct?.rank === null ||
      comparablePct?.rank === undefined
    ) {
      continue;
    }

    calendarKey = comparableBand.calendarKey;

    const peersToCompare =
      selectedPeerCiks && selectedPeerCiks.size > 0
        ? comparableBand.peers.filter((peer) => selectedPeerCiks.has(peer.cik))
        : comparableBand.peers;

    const peerValues = peersToCompare.map((peer) => peer.value);
    const allValues = [targetAtPeriod.value, ...peerValues];
    const rank =
      selectedPeerCiks && selectedPeerCiks.size > 0
        ? distributionPercentile(targetAtPeriod.value, allValues)
        : comparablePct.rank;
    const median =
      selectedPeerCiks && selectedPeerCiks.size > 0
        ? medianValue(peerValues)
        : comparableBand.median;

    if (median === null || rank === null || rank === undefined) {
      continue;
    }

    const scaleMin = Math.min(...allValues);
    const scaleMax = Math.max(...allValues);
    const zeroPosition = zeroScalePosition(scaleMin, scaleMax);
    const targetPosition = valueScalePosition(targetAtPeriod.value, scaleMin, scaleMax);

    const peerMarkers: PeerMarkerModel[] = peersToCompare.map((peer) => {
      const chip = peerColorByCik.get(peer.cik);
      return {
        ticker: chip?.ticker ?? peer.entityName,
        position: valueScalePosition(peer.value, scaleMin, scaleMax),
        barColorClass: chip?.palette.bar ?? "bg-zinc-400",
      };
    });

    rows.push({
      metricKey,
      label: formatMetricLabel(metricKey),
      calendarKey,
      peerCount: peersToCompare.length,
      rank,
      targetPosition,
      scaleMin,
      scaleMax,
      zeroPosition,
      tone: getPercentileTone(rank),
      targetValue: targetAtPeriod.value,
      medianValue: median,
      targetFormatted: formatPeerMetricValue(metricKey, targetAtPeriod.value),
      medianFormatted: formatPeerMetricValue(metricKey, median),
      scaleMinFormatted: formatPeerMetricValue(metricKey, scaleMin),
      scaleMaxFormatted: formatPeerMetricValue(metricKey, scaleMax),
      divergenceTitle: divergenceTitle(metricKey, bundle.divergences, calendarKey),
      peerMarkers,
    });
  }

  return { rows, calendarKey };
}
