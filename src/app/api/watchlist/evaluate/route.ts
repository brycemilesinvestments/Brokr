import { NextResponse } from "next/server";
import { buildTimeSeriesBundle } from "@/lib/analysis";
import { createEdgarClient } from "@/lib/edgar";
import { buildExtendedMetricsBundle } from "@/lib/metrics";
import { computeHealthScore } from "@/lib/metrics/health";
import { loadWatchlist, runWatchlistRouter } from "@/lib/watchlist";
import type { MetricPoint } from "@/lib/watchlist/types";
import {
  getWatchlistEntries,
  loadFiredEventKeys,
  recordAlertEvents,
} from "@/lib/supabase/watchlist";
import { fetchInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-insider-transactions";
import { createAdminClient } from "@/lib/supabase/admin";

function seriesFromRatios(
  bundle: ReturnType<typeof buildTimeSeriesBundle>,
  key: "net_margin" | "operating_margin" | "debt_to_equity",
): MetricPoint[] {
  return bundle.ratioSeries[key]
    .filter((p) => p.value !== undefined)
    .map((p) => ({ periodEnd: p.periodEnd, value: p.value as number }));
}

function fcfSeries(
  metrics: ReturnType<typeof buildExtendedMetricsBundle>,
): MetricPoint[] {
  return metrics.cashFlowQuality.fcfMargin.annual
    .filter((p) => p.value !== undefined)
    .map((p) => ({ periodEnd: p.periodEnd, value: p.value as number }));
}

function healthScoreSeries(cik: string, entityName: string, bundle: ReturnType<typeof buildExtendedMetricsBundle>, timeSeries: ReturnType<typeof buildTimeSeriesBundle>): MetricPoint[] {
  const health = computeHealthScore({ cik, entityName, timeSeries, metricsBundle: bundle });
  return health.series.points.map((p) => ({ periodEnd: p.periodEnd, value: p.composite }));
}

export async function POST() {
  const rows = await getWatchlistEntries();
  const entries = loadWatchlist(rows);

  if (entries.length === 0) {
    return NextResponse.json({ alerts: [], message: "Watchlist is empty" });
  }

  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const ciks = [...new Set(entries.map((e) => e.cik))].toSorted();
  const firedEventKeys = await loadFiredEventKeys(ciks);

  const filingsByCik: Record<string, Awaited<ReturnType<typeof edgar.getSubmissions>>["filings"]> = {};
  const metricSeriesByCik: Record<string, Record<string, MetricPoint[]>> = {};
  const transactionsByCik: Record<string, Awaited<ReturnType<typeof fetchInsiderTransactions>>["transactions"]> = {};
  const seenAccessionsByCik: Record<string, Set<string>> = {};

  const cikResults = await Promise.all(
    ciks.map(async (cik) => {
      const [submissions, insider] = await Promise.all([
        edgar.getSubmissions(cik),
        fetchInsiderTransactions(cik).catch(() => null),
      ]);

      let metricSeries: Record<string, MetricPoint[]> = {};
      try {
        const facts = await edgar.getCompanyFacts(cik);
        const timeSeries = buildTimeSeriesBundle(facts);
        const metrics = buildExtendedMetricsBundle(timeSeries, facts);
        metricSeries = {
          net_margin: seriesFromRatios(timeSeries, "net_margin"),
          operating_margin: seriesFromRatios(timeSeries, "operating_margin"),
          debt_to_equity: seriesFromRatios(timeSeries, "debt_to_equity"),
          fcf: fcfSeries(metrics),
          health_score: healthScoreSeries(cik, facts.entityName, metrics, timeSeries),
        };
      } catch {
        metricSeries = {};
      }

      return { cik, submissions, insider, metricSeries };
    }),
  );

  for (const { cik, submissions, insider, metricSeries } of cikResults) {
    filingsByCik[cik] = submissions.filings;
    seenAccessionsByCik[cik] = new Set(
      submissions.filings.slice(0, 5).map((f) => f.accessionNumber),
    );
    metricSeriesByCik[cik] = metricSeries;

    if (insider) {
      transactionsByCik[cik] = insider.transactions.map((t) => ({
        reportingOwner: t.reportingOwner,
        transactionDate: t.transactionDate,
        transactionType: t.transactionType,
        acquiredOrDisposed: t.acquiredOrDisposed,
        sharesTransacted: t.sharesTransacted,
        accessionNumber: t.accessionNumber,
      }));
    }
  }

  const output = await runWatchlistRouter({
    entries,
    filingsByCik,
    seenAccessionsByCik,
    metricSeriesByCik,
    transactionsByCik,
    firedEventKeys,
    emitter: async () => {},
  });

  await recordAlertEvents(
    output.alerts.map((a) => ({
      cik: a.cik,
      type: a.type,
      eventKey: a.eventKey,
    })),
  );

  return NextResponse.json(output);
}
