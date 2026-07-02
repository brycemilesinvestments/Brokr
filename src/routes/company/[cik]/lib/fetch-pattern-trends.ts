import { buildTimeSeriesBundle } from "@/lib/analysis";
import { createEdgarClient } from "@/lib/edgar";
import { buildExtendedMetricsBundle, detectTrends } from "@/lib/metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PatternTrendsPayload } from "@/routes/company/[cik]/features/patterns/types";

export type { PatternTrendsPayload } from "@/routes/company/[cik]/features/patterns/types";

export async function fetchPatternTrends(cik: string): Promise<PatternTrendsPayload> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const facts = await edgar.getCompanyFacts(cik);
  const timeSeries = buildTimeSeriesBundle(facts);
  const metricsBundle = buildExtendedMetricsBundle(timeSeries, facts);
  const result = detectTrends({ timeSeries, metricsBundle });

  return {
    cik,
    entityName: facts.entityName,
    ...result,
  };
}
