"use client";

import { useMemo, useState } from "react";
import type { CompanyAnalysisOutput } from "@/lib/orchestrate";
import { companyInitials } from "@/routes/company/[cik]/features/company-info/utils/format-company-header";
import type { Filing } from "@/routes/company/[cik]/types";
import { AnalysisStatusFooter } from "./analysis-status-footer";
import { InsiderSignalBar } from "./insider-signal-bar";
import { MetricSeriesGrid } from "./metric-series-grid";
import { buildAnalysisVerdict, strengthClass } from "../lib/build-analysis-summaries";
import { buildMetricSeriesSections, mergeAnalysisCharts } from "../lib/chart-helpers";

type AnalysisDashboardProps = {
  cik: string;
  filings: Filing[];
  data: CompanyAnalysisOutput;
  ticker?: string;
};

export function AnalysisDashboard({ cik, filings, data, ticker }: AnalysisDashboardProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const extendedChart = useMemo(
    () => ({
      ...data.metrics.chart,
      ...Object.fromEntries(
        [...data.metrics.segments.endMarket, ...data.metrics.segments.geography].map((segment) => [
          `${segment.dimension}:${segment.segmentName}`,
          data.metrics.chart[`${segment.dimension}:${segment.segmentName}`] ?? [],
        ]),
      ),
    }),
    [data.metrics.chart, data.metrics.segments.endMarket, data.metrics.segments.geography],
  );

  const allCharts = useMemo(
    () =>
      mergeAnalysisCharts({
        fundamentals: data.timeSeries.chart,
        extended: extendedChart,
        valuation: data.valuation?.chart,
      }),
    [data.timeSeries.chart, extendedChart, data.valuation?.chart],
  );

  const sections = useMemo(() => buildMetricSeriesSections(allCharts), [allCharts]);
  const verdict = useMemo(() => buildAnalysisVerdict(data, allCharts), [data, allCharts]);
  const complete = data.completed && data.terminatedReason === "complete";

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
      <div className="border-b border-zinc-100 px-6 pb-[22px] pt-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-[9px] bg-zinc-900 font-mono text-[11px] font-bold text-white">
            {companyInitials(data.coverage.entityName)}
          </div>
          <span className="text-sm font-semibold text-zinc-900">{data.coverage.entityName}</span>
          {ticker ? (
            <span className="font-mono text-[11px] font-semibold text-zinc-400">{ticker}</span>
          ) : null}
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.04em] ${
              complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${complete ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {complete ? "Complete" : "Partial"}
          </span>
        </div>

      </div>

      <div className="grid border-b border-zinc-100 sm:grid-cols-2 xl:grid-cols-4">
        {verdict.pillars.map((pillar, index) => (
          <div
            key={pillar.key}
            className={`px-5 py-[18px] lg:px-6 ${
              index < verdict.pillars.length - 1 ? "border-b border-zinc-100 xl:border-b-0 xl:border-r" : ""
            } ${index % 2 === 0 ? "sm:border-r sm:border-zinc-100" : ""}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">{pillar.label}</span>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.04em] ${strengthClass(pillar.strength)}`}
              >
                {pillar.strengthLabel}
              </span>
            </div>
            <p className="font-mono text-[15px] font-bold tracking-[-0.01em] text-zinc-900">
              {pillar.headline}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">{pillar.detail}</p>
          </div>
        ))}
      </div>

      <MetricSeriesGrid
        cik={cik}
        filings={filings}
        sections={sections}
        chart={allCharts}
        anomalies={data.crossAnomalies}
        explanations={data.anomalyExplanations}
        metricPolarities={data.metricPolarities ?? {}}
        expandedMetric={expandedMetric}
        onSelectMetric={setExpandedMetric}
      />

      <InsiderSignalBar insider={data.insider} />

      {data.metrics.missing.length > 0 ? (
        <details className="border-t border-zinc-100">
          <summary className="cursor-pointer px-6 py-3 text-sm font-medium text-zinc-900 lg:px-8">
            Derived metric gaps ({data.metrics.missing.length})
          </summary>
          <div className="overflow-x-auto border-t border-zinc-100">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-6 py-2 font-medium lg:px-8">Metric</th>
                  <th className="px-4 py-2 font-medium">Period</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.metrics.missing.slice(0, 20).map((gap) => (
                  <tr key={`${gap.metric}-${gap.periodEnd}-${gap.reason}`}>
                    <td className="px-6 py-2 text-zinc-900 lg:px-8">{gap.metric}</td>
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

      <AnalysisStatusFooter data={data} />
    </section>
  );
}
