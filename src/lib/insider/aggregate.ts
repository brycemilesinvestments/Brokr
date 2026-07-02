import type { InsiderTransaction } from "@/lib/edgar";
import type { MarketQuote } from "@/lib/market";
import {
  buildInsiderEvent,
  validateFilingDateAlignment,
} from "@/lib/insider/classify";
import { computeAbnormalReturn } from "@/lib/insider/abnormal";
import {
  CLUSTER_MIN_INSIDERS,
  CLUSTER_WINDOW_DAYS,
  DEFAULT_EVENT_WINDOWS,
  MINIMUM_SIGNAL_EVENTS,
  type AbnormalReturn,
  type EventStudyAggregation,
  type EventStudyCompleteResult,
  type EventStudyResult,
  type InsiderEvent,
  type InsiderEventCluster,
  type InsiderTransactionCode,
  type InsufficientSignalResult,
  type SignalDecay,
} from "@/lib/insider/types";

export type EventStudyTransaction = {
  transaction: InsiderTransaction;
  filingDate: string;
};

export type EventStudyInput = {
  cik: string;
  symbol: string;
  transactions: EventStudyTransaction[];
  stockPrices: MarketQuote[];
  benchmarkPrices: MarketQuote[];
  minimumSignalEvents?: number;
};

function calendarDaysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.POSITIVE_INFINITY;
  return Math.abs(end - start) / (1000 * 60 * 60 * 24);
}

function assignClusterIds(events: InsiderEvent[]): InsiderEvent[] {
  const purchases = events.filter(
    (event) => event.classification === "signal" && event.transactionCode === "P",
  );
  const sorted = [...purchases].sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  const clusterIdByKey = new Map<string, string>();
  let clusterCounter = 0;

  for (let i = 0; i < sorted.length; i++) {
    const windowEvents: InsiderEvent[] = [sorted[i]];
    const owners = new Set([sorted[i].transaction.reportingOwner]);

    for (let j = i + 1; j < sorted.length; j++) {
      if (
        calendarDaysBetween(sorted[i].filingDate, sorted[j].filingDate) >
        CLUSTER_WINDOW_DAYS
      ) {
        break;
      }
      windowEvents.push(sorted[j]);
      owners.add(sorted[j].transaction.reportingOwner);
    }

    if (owners.size < CLUSTER_MIN_INSIDERS) continue;

    const clusterId = `cluster-${clusterCounter++}`;
    for (const event of windowEvents) {
      clusterIdByKey.set(
        `${event.transaction.reportingOwner}|${event.filingDate}`,
        clusterId,
      );
    }
  }

  return events.map((event) => {
    const clusterId = clusterIdByKey.get(
      `${event.transaction.reportingOwner}|${event.filingDate}`,
    );
    return clusterId ? { ...event, clusterId } : event;
  });
}

/** C9.6 — Flag clusters when multiple insiders buy within a rolling window. */
export function detectClusters(events: InsiderEvent[]): InsiderEventCluster[] {
  const clusteredEvents = assignClusterIds(events);
  const clusterMap = new Map<string, InsiderEventCluster>();

  for (const event of clusteredEvents) {
    if (!event.clusterId) continue;

    const existing = clusterMap.get(event.clusterId);
    if (existing) {
      existing.events.push(event);
      if (event.filingDate < existing.startDate) existing.startDate = event.filingDate;
      if (event.filingDate > existing.endDate) existing.endDate = event.filingDate;
      continue;
    }

    clusterMap.set(event.clusterId, {
      clusterId: event.clusterId,
      startDate: event.filingDate,
      endDate: event.filingDate,
      windowDays: CLUSTER_WINDOW_DAYS,
      events: [event],
    });
  }

  return [...clusterMap.values()];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** C9.5 — Mean CAR and hit rate per signal type and window. */
export function computeAggregations(
  events: InsiderEvent[],
  abnormalReturns: AbnormalReturn[],
): EventStudyAggregation[] {
  const signalEvents = events.filter((event) => event.classification === "signal");
  const aggregations: EventStudyAggregation[] = [];

  for (const signalType of [...new Set(signalEvents.map((event) => event.transactionCode))]) {
    for (const window of DEFAULT_EVENT_WINDOWS) {
      const matchingReturns = abnormalReturns.filter(
        (item) =>
          item.window.label === window.label &&
          signalEvents.some(
            (event) =>
              event.transactionCode === signalType &&
              event.filingDate === item.filingDate,
          ),
      );

      const cars = matchingReturns.map((item) => item.cumulativeAbnormalReturn);
      aggregations.push({
        signalType,
        window,
        eventCount: matchingReturns.length,
        meanCar: mean(cars),
        hitRate:
          cars.length === 0
            ? 0
            : cars.filter((car) => car > 0).length / cars.length,
      });
    }
  }

  return aggregations;
}

/** C9.5 — CAR decay across short / medium / long windows. */
export function computeSignalDecay(
  aggregations: EventStudyAggregation[],
): SignalDecay[] {
  const byType = new Map<InsiderTransactionCode, SignalDecay>();

  for (const aggregation of aggregations) {
    const existing = byType.get(aggregation.signalType) ?? {
      signalType: aggregation.signalType,
      shortCar: 0,
      mediumCar: 0,
      longCar: 0,
    };

    if (aggregation.window.label === "short") existing.shortCar = aggregation.meanCar;
    if (aggregation.window.label === "medium") existing.mediumCar = aggregation.meanCar;
    if (aggregation.window.label === "long") existing.longCar = aggregation.meanCar;

    byType.set(aggregation.signalType, existing);
  }

  return [...byType.values()];
}

function buildInsufficientResult(
  cik: string,
  signalEventCount: number,
  minimumRequired: number,
): InsufficientSignalResult {
  return {
    status: "insufficient_signal",
    cik,
    signalEventCount,
    minimumRequired,
    message:
      signalEventCount === 0
        ? "no actionable insider signal; newly spun-off, insufficient history"
        : `insufficient signal: ${signalEventCount} signal events (minimum ${minimumRequired})`,
  };
}

export function runEventStudy(input: EventStudyInput): EventStudyResult {
  const minimumRequired = input.minimumSignalEvents ?? MINIMUM_SIGNAL_EVENTS;
  const events: InsiderEvent[] = [];
  const noiseEvents: InsiderEvent[] = [];

  for (const { transaction, filingDate } of input.transactions) {
    const alignment = validateFilingDateAlignment(
      filingDate,
      transaction.transactionDate,
      filingDate,
    );
    if (!alignment.valid) continue;

    const event = buildInsiderEvent(transaction, filingDate);
    if (!event) continue;

    if (event.classification === "signal") {
      events.push(event);
    } else {
      noiseEvents.push(event);
    }
  }

  const signalEvents = events.filter((event) => event.classification === "signal");
  if (signalEvents.length < minimumRequired) {
    return buildInsufficientResult(input.cik, signalEvents.length, minimumRequired);
  }

  const clusteredEvents = assignClusterIds(signalEvents);
  const clusters = detectClusters(clusteredEvents);
  const abnormalReturns: AbnormalReturn[] = [];

  for (const event of clusteredEvents) {
    for (const window of DEFAULT_EVENT_WINDOWS) {
      const result = computeAbnormalReturn(
        input.stockPrices,
        input.benchmarkPrices,
        event.filingDate,
        window,
      );
      if (result) abnormalReturns.push(result);
    }
  }

  const aggregations = computeAggregations(clusteredEvents, abnormalReturns);
  const signalDecay = computeSignalDecay(aggregations);

  const complete: EventStudyCompleteResult = {
    status: "complete",
    cik: input.cik,
    symbol: input.symbol,
    eventCount: clusteredEvents.length + noiseEvents.length,
    signalEvents: clusteredEvents,
    noiseEvents,
    abnormalReturns,
    aggregations,
    signalDecay,
    clusters,
  };

  return complete;
}

export { MINIMUM_SIGNAL_EVENTS };
