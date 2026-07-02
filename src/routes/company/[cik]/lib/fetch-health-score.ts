import { buildTimeSeriesBundle } from "@/lib/analysis";
import { createEdgarClient } from "@/lib/edgar";
import { buildExtendedMetricsBundle, buildHealthScoreBundle } from "@/lib/metrics";
import type { HealthScoreBundle } from "@/lib/metrics/health";
import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchHealthScore(cik: string): Promise<HealthScoreBundle> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const facts = await edgar.getCompanyFacts(cik);
  const timeSeries = buildTimeSeriesBundle(facts);
  const metricsBundle = buildExtendedMetricsBundle(timeSeries, facts);

  return buildHealthScoreBundle({
    cik,
    entityName: facts.entityName,
    timeSeries,
    metricsBundle,
  });
}
