import { buildCompanyTimeSeries } from "@/lib/orchestrate";
import { createEdgarClient } from "@/lib/edgar";
import { ALL_WHITELISTED_CONCEPTS } from "@/lib/edgar";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FinancialTrendsPayload, FinancialTrendsSeriesSummary } from "@/routes/company/[cik]/features/financial-trends/types";
import { humanizeConcept } from "@/routes/company/[cik]/features/financial-trends/utils/humanize-concept";

function buildSeriesSummary(bundle: NonNullable<Awaited<ReturnType<typeof buildCompanyTimeSeries>>["state"]["bundle"]>): FinancialTrendsSeriesSummary[] {
  return ALL_WHITELISTED_CONCEPTS.map((concept) => {
    const series = bundle.metrics.series[concept];
    return {
      concept,
      label: humanizeConcept(concept),
      status: series?.status ?? "not_reported",
      annualCount: series?.annual.length ?? 0,
      quarterlyCount: series?.quarterly.length ?? 0,
      gapCount: series?.gaps.length ?? 0,
    };
  });
}

export async function fetchFinancialTrends(cik: string): Promise<FinancialTrendsPayload> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const { state, validation } = await buildCompanyTimeSeries(cik, edgar);

  if (!state.bundle) {
    throw new Error("Failed to build financial time series");
  }

  const bundle = state.bundle;

  return {
    cik: bundle.cik,
    entityName: bundle.entityName,
    chart: bundle.chart,
    anomalies: bundle.anomalies,
    notReported: state.notReported,
    contract: validation,
    seriesSummary: buildSeriesSummary(bundle),
  };
}
