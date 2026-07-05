"use client";

import type { MetricPolarityMap } from "@/lib/metrics/polarity/types";
import type { ChartBundle } from "@/lib/analysis";
import type { AnomalyExplanation, CrossLayerAnomaly } from "@/lib/orchestrate";
import type { MetricSeriesSection } from "../lib/chart-helpers";
import { ExpandedMetricPanel } from "./expanded-metric-panel";
import { MetricSeriesCard } from "./metric-series-card";

type MetricSeriesGridProps = {
  sections: MetricSeriesSection[];
  chart: ChartBundle;
  anomalies: CrossLayerAnomaly[];
  explanations: AnomalyExplanation[];
  metricPolarities?: MetricPolarityMap;
  expandedMetric: string | null;
  onSelectMetric: (metric: string | null) => void;
};

export function MetricSeriesGrid({
  sections,
  chart,
  anomalies,
  explanations,
  metricPolarities,
  expandedMetric,
  onSelectMetric,
}: MetricSeriesGridProps) {
  return (
    <div className="px-6 pb-2 pt-5">
      <p className="mb-3.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
        All series · click to expand
      </p>

      {expandedMetric ? (
        <ExpandedMetricPanel
          metric={expandedMetric}
          chart={chart}
          onClose={() => onSelectMetric(null)}
        />
      ) : null}

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={`${section.category}-${section.subcategory}`}>
            <h4 className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              {section.subcategory}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.metrics.map((metric) => (
                <MetricSeriesCard
                  key={metric}
                  metric={metric}
                  chart={chart}
                  anomalies={anomalies}
                  explanations={explanations}
                  metricPolarities={metricPolarities}
                  selected={expandedMetric === metric}
                  onSelect={() =>
                    onSelectMetric(expandedMetric === metric ? null : metric)
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
