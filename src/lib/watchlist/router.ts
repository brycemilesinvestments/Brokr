import type {
  StructuredAlert,
  WatchlistRouterInput,
  WatchlistRouterOutput,
} from "@/lib/watchlist/types";
import { detectNewFilings } from "@/lib/watchlist/detect-new-filings";
import { evalThresholds } from "@/lib/watchlist/eval-thresholds";
import { evalInsider } from "@/lib/watchlist/eval-insider";
import { dedup } from "@/lib/watchlist/dedup";
import { emitAlerts } from "@/lib/watchlist/emit-alerts";

/**
 * ROUTER — load_watchlist → detect_new_filings → eval_thresholds →
 *           eval_insider → dedup → emit_alerts
 *
 * Each step is deterministic given the same input. The caller is responsible
 * for loading entries and persisting the output (newSeenAccessions,
 * newFiredEventKeys) to maintain idempotency across polls.
 */
export async function runWatchlistRouter(
  input: WatchlistRouterInput,
): Promise<WatchlistRouterOutput> {
  const {
    entries,
    filingsByCik,
    seenAccessionsByCik,
    metricSeriesByCik,
    transactionsByCik,
    firedEventKeys,
    emitter,
  } = input;

  const candidates: StructuredAlert[] = [];
  const newSeenAccessions: Record<string, string[]> = {};

  // ── Per-entry evaluation ───────────────────────────────────────────────────
  for (const entry of entries) {
    const filings = filingsByCik[entry.cik] ?? [];
    const seenAccessions = seenAccessionsByCik[entry.cik] ?? new Set<string>();
    const metricSeries = metricSeriesByCik?.[entry.cik] ?? {};
    const transactions = transactionsByCik?.[entry.cik] ?? [];

    // Step: detect_new_filings (W2)
    const filingAlerts = detectNewFilings(entry, filings, seenAccessions);
    candidates.push(...filingAlerts);

    // Accumulate new accessions so the caller can persist them.
    if (filingAlerts.length > 0) {
      const prev = newSeenAccessions[entry.cik] ?? [];
      newSeenAccessions[entry.cik] = [
        ...prev,
        ...filingAlerts.map((a) => a.accessionNumber),
      ];
    }

    // Step: eval_thresholds (W3)
    if (Object.keys(metricSeries).length > 0) {
      const thresholdAlerts = evalThresholds(entry, metricSeries);
      candidates.push(...thresholdAlerts);
    }

    // Step: eval_insider (W4)
    if (transactions.length > 0) {
      const insiderAlerts = evalInsider(entry, transactions);
      candidates.push(...insiderAlerts);
    }
  }

  // ── Step: dedup (W5) ───────────────────────────────────────────────────────
  const { newAlerts, newFiredKeys } = dedup(candidates, firedEventKeys);

  // ── Step: emit_alerts (W6) ─────────────────────────────────────────────────
  await emitAlerts(newAlerts, emitter);

  return {
    alerts: newAlerts,
    newSeenAccessions,
    newFiredEventKeys: newFiredKeys,
  };
}
