import type { SeriesAnomaly, TimeSeriesBundle } from "@/lib/analysis";
import type { EventStudyCompleteResult, EventStudyResult } from "@/lib/insider";
import type { ExtendedMetricsBundle } from "@/lib/metrics";
import type { ValuationBundle } from "@/lib/valuation";
import type { CrossLayerAnomaly } from "@/lib/orchestrate/types";

const MARGIN_EXPAND_THRESHOLD = 0.02;
const MULTIPLE_COMPRESS_THRESHOLD = -0.1;
const INSIDER_DROP_THRESHOLD = -0.03;

function fundamentalsAnomalies(bundle: TimeSeriesBundle): CrossLayerAnomaly[] {
  return bundle.anomalies.map((anomaly, index) => ({
    id: `fundamentals-${index}-${anomaly.periodEnd}-${anomaly.metric}`,
    layers: ["fundamentals"],
    type: anomaly.type,
    date: anomaly.periodEnd,
    periodEnd: anomaly.periodEnd,
    chartKeys: [anomaly.metric],
    magnitude: anomaly.magnitude,
    description: `${anomaly.metric} ${anomaly.type} (${anomaly.frequency}, magnitude ${anomaly.magnitude.toFixed(4)})`,
  }));
}

function valuationCompressionAnomalies(
  timeSeries: TimeSeriesBundle,
  valuation?: ValuationBundle,
): CrossLayerAnomaly[] {
  if (!valuation) return [];

  const anomalies: CrossLayerAnomaly[] = [];
  const grossMargin = timeSeries.ratioSeries.gross_margin
    .filter((p) => p.frequency === "quarterly" && p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const pePoints = valuation.multiples.pe.points
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 1; i < grossMargin.length; i++) {
    const marginDelta = (grossMargin[i].value ?? 0) - (grossMargin[i - 1].value ?? 0);
    if (marginDelta < MARGIN_EXPAND_THRESHOLD) continue;

    const periodEnd = grossMargin[i].periodEnd;
    const peAtPeriod = pePoints.filter((p) => p.ttmPeriodEnd === periodEnd);
    if (peAtPeriod.length < 2) continue;

    const peDelta =
      (peAtPeriod[peAtPeriod.length - 1].value ?? 0) -
      (peAtPeriod[0].value ?? 0);
    if (peDelta > MULTIPLE_COMPRESS_THRESHOLD) continue;

    anomalies.push({
      id: `valuation-compress-${periodEnd}`,
      layers: ["valuation", "cross_layer"],
      type: "multiple_compression_margin_expansion",
      date: periodEnd,
      periodEnd,
      chartKeys: ["gross_margin", "pe"],
      magnitude: peDelta,
      description: `Gross margin expanded ${(marginDelta * 100).toFixed(1)}pp while P/E compressed at ${periodEnd}`,
    });
  }

  return anomalies;
}

function insiderClusterAnomalies(insider: EventStudyResult): CrossLayerAnomaly[] {
  if (insider.status !== "complete") return [];

  const complete = insider as EventStudyCompleteResult;
  const anomalies: CrossLayerAnomaly[] = [];

  for (const cluster of complete.clusters) {
    const clusterReturns = complete.abnormalReturns.filter(
      (ar) =>
        cluster.events.some((e) => e.filingDate === ar.filingDate) &&
        ar.window.label === "medium",
    );
    if (clusterReturns.length === 0) continue;

    const meanCar =
      clusterReturns.reduce((sum, ar) => sum + ar.abnormalReturn, 0) /
      clusterReturns.length;
    if (meanCar >= INSIDER_DROP_THRESHOLD) continue;

    anomalies.push({
      id: `insider-cluster-${cluster.clusterId}`,
      layers: ["insider", "cross_layer"],
      type: "cluster_buy_into_price_drop",
      date: cluster.startDate,
      chartKeys: ["price", "insider_cluster"],
      magnitude: meanCar,
      description: `Insider cluster (${cluster.events.length} events) with mean abnormal return ${(meanCar * 100).toFixed(1)}% over medium window`,
    });
  }

  return anomalies;
}

function dedupeAnomalies(anomalies: CrossLayerAnomaly[]): CrossLayerAnomaly[] {
  const seen = new Set<string>();
  const result: CrossLayerAnomaly[] = [];

  for (const anomaly of anomalies) {
    const key = `${anomaly.type}:${anomaly.date}:${anomaly.chartKeys.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(anomaly);
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function detectCrossLayerAnomalies(input: {
  timeSeries: TimeSeriesBundle;
  metrics: ExtendedMetricsBundle;
  valuation?: ValuationBundle;
  insider: EventStudyResult;
}): CrossLayerAnomaly[] {
  void input.metrics;

  return dedupeAnomalies([
    ...fundamentalsAnomalies(input.timeSeries),
    ...valuationCompressionAnomalies(input.timeSeries, input.valuation),
    ...insiderClusterAnomalies(input.insider),
  ]);
}

export function buildAnomalyExcerpt(
  anomaly: CrossLayerAnomaly,
  timeSeries: TimeSeriesBundle,
): string {
  const periodEnd = anomaly.periodEnd ?? anomaly.date;
  const metricKey = anomaly.chartKeys[0];
  const series = timeSeries.metrics.series[metricKey as keyof typeof timeSeries.metrics.series];
  const point =
    series?.status === "reported"
      ? [...series.quarterly, ...series.annual].find((p) => p.periodEnd === periodEnd)
      : undefined;

  const filingRef = point
    ? `[${point.form ?? "filing"} filed ${point.filed}]`
    : `[period ${periodEnd}]`;

  return `${filingRef} ${anomaly.description}. Review MD&A and footnotes for ${periodEnd} for management commentary on ${anomaly.chartKeys.join(", ")}.`;
}

export function isChartMarkable(anomaly: CrossLayerAnomaly): boolean {
  return Boolean(anomaly.date && anomaly.chartKeys.length > 0);
}

function chartMarkableAnomalies(anomalies: SeriesAnomaly[]): boolean {
  return anomalies.every((a) => Boolean(a.periodEnd && a.metric));
}
