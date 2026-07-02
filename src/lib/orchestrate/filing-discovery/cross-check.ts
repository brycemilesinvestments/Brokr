import type { ForwardSignals } from "@/lib/edgar/discovery";
import { CONCENTRATION_TOLERANCE_PCT, type QualitativeSignals } from "@/lib/ai/qualitative-types";
import type { CrossCheckResult } from "@/lib/orchestrate/filing-discovery/types";

function latestConcentrationPct(forwardSignals: ForwardSignals): number | undefined {
  const series = forwardSignals.customerConcentration;
  if (series.status !== "reported") return undefined;

  const latest =
    series.quarterly[series.quarterly.length - 1] ??
    series.annual[series.annual.length - 1];
  return latest?.value;
}

function proseConcentrationPct(signals: QualitativeSignals): number | undefined {
  for (const section of signals.sections) {
    if (section.customers?.found && section.customers.concentration_pct !== undefined) {
      return section.customers.concentration_pct;
    }
  }
  return undefined;
}

/** A4 — Cross-check numeric D4 signals against AI-extracted prose signals. */
export function crossCheckSignals(
  forwardSignals: ForwardSignals,
  qualitativeSignals: QualitativeSignals,
): CrossCheckResult[] {
  const results: CrossCheckResult[] = [];
  const numericPct = latestConcentrationPct(forwardSignals);
  const prosePct = proseConcentrationPct(qualitativeSignals);

  if (numericPct !== undefined || prosePct !== undefined) {
    const agrees =
      numericPct === undefined ||
      prosePct === undefined ||
      Math.abs(numericPct - prosePct) <= CONCENTRATION_TOLERANCE_PCT;

    results.push({
      field: "customer_concentration_pct",
      numericValue: numericPct,
      proseValue: prosePct,
      tolerance: CONCENTRATION_TOLERANCE_PCT,
      agrees,
      message: agrees
        ? undefined
        : `Numeric ${numericPct}% vs prose ${prosePct}% exceeds ±${CONCENTRATION_TOLERANCE_PCT}% tolerance`,
    });
  }

  return results;
}
