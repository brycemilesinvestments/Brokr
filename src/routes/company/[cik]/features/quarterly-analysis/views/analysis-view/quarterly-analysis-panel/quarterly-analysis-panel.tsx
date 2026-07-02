"use client";

import { Button } from "@/components/ui/button";
import { useCompanyAnalysis } from "@/routes/company/[cik]/features/quarterly-analysis/hooks/use-company-analysis";
import type { CompanyAnalysisPanelProps } from "@/routes/company/[cik]/features/quarterly-analysis/types";
import { ContractStatus } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/components/contract-status";
import { AnomalyExplanationsSection } from "./components/anomaly-explanations-section";
import { ChartMetricExplorer } from "./components/chart-metric-explorer";
import { CoverageReportCard } from "./components/coverage-report-card";
import { CrossAnomaliesSection } from "./components/cross-anomalies-section";
import { InsiderEventStudySection } from "./components/insider-event-study-section";
import { ValuationSummary } from "./components/valuation-summary";
import {
  EXTENDED_METRIC_GROUPS,
  FUNDAMENTALS_METRIC_GROUPS,
  VALUATION_METRIC_GROUPS,
} from "./constants";

export function CompanyAnalysisPanel({ cik, ticker }: CompanyAnalysisPanelProps) {
  const { data, loading, error, refetch } = useCompanyAnalysis(cik, true, ticker);

  if (loading) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-zinc-900">Company analysis</h2>
          <p className="mt-1 text-sm text-zinc-500">Loading full Chunk 10 analysis…</p>
        </div>
        <div className="space-y-4 px-6 py-8">
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-100" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-zinc-900">Company analysis</h2>
        </div>
        <div className="px-6 py-8">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const extendedChart = {
    ...data.metrics.chart,
    ...Object.fromEntries(
      [...data.metrics.segments.endMarket, ...data.metrics.segments.geography].map((segment) => [
        `${segment.dimension}:${segment.segmentName}`,
        data.metrics.chart[`${segment.dimension}:${segment.segmentName}`] ?? [],
      ]),
    ),
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Company analysis</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Full Chunk 10 output — fundamentals, extended metrics, valuation, insider event study,
              cross-layer anomalies, and AI explanations.
            </p>
          </div>
          <div className="text-sm text-zinc-500">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
            <p className="mt-1 font-medium capitalize text-zinc-900">{data.terminatedReason}</p>
            {data.unsatisfied.length > 0 ? (
              <p className="mt-0.5 text-xs text-amber-700">{data.unsatisfied.length} unsatisfied checks</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-10 px-6 py-6">
        <CoverageReportCard coverage={data.coverage} completed={data.completed} ticker={data.ticker} />

        <ContractStatus contract={data.contract} />

        <ChartMetricExplorer
          title="Fundamentals"
          chart={data.timeSeries.chart}
          groups={FUNDAMENTALS_METRIC_GROUPS}
          defaultMetric="RevenueFromContractWithCustomerExcludingAssessedTax"
        />

        <ChartMetricExplorer
          title="Extended metrics"
          chart={extendedChart}
          groups={EXTENDED_METRIC_GROUPS}
          defaultMetric="free_cash_flow"
          emptyMessage="Extended metrics not available from SEC data."
        />

        {data.metrics.missing.length > 0 ? (
          <details className="rounded-xl border border-zinc-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-900">
              Derived metric gaps ({data.metrics.missing.length})
            </summary>
            <div className="overflow-x-auto border-t border-zinc-100">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Metric</th>
                    <th className="px-4 py-2 font-medium">Period</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.metrics.missing.slice(0, 20).map((gap) => (
                    <tr key={`${gap.metric}-${gap.periodEnd}-${gap.reason}`}>
                      <td className="px-4 py-2 text-zinc-900">{gap.metric}</td>
                      <td className="px-4 py-2 font-mono text-zinc-600">
                        {gap.periodEnd} ({gap.frequency})
                      </td>
                      <td className="px-4 py-2 text-zinc-600">{gap.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}

        {data.valuation ? (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Valuation</h3>
            <ValuationSummary valuation={data.valuation} />
            <div className="mt-6">
              <ChartMetricExplorer
                title="Valuation multiples"
                chart={data.valuation.chart}
                groups={VALUATION_METRIC_GROUPS}
                defaultMetric="pe"
                emptyMessage="Valuation multiples unavailable."
              />
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Valuation</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Valuation requires a ticker and market price history. Add a ticker to enable EV and
              multiple charts.
            </p>
          </div>
        )}

        <InsiderEventStudySection insider={data.insider} />

        <CrossAnomaliesSection anomalies={data.crossAnomalies} />

        <AnomalyExplanationsSection explanations={data.anomalyExplanations} />
      </div>
    </section>
  );
}

/** @deprecated Use CompanyAnalysisPanel */
export const QuarterlyAnalysisPanel = CompanyAnalysisPanel;
