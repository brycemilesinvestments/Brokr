import type { ChartPoint } from "@/lib/analysis";
import { formatDeltaPercent, formatMetricValue } from "../utils/format-metric";
import { humanizeConcept } from "@/routes/company/[cik]/features/financial-trends/utils/humanize-concept";

type MetricDataTableProps = {
  metric: string;
  points: ChartPoint[];
};

export function MetricDataTable({ metric, points }: MetricDataTableProps) {
  const label = metric.includes("_") ? metric.replace(/_/g, " ") : humanizeConcept(metric);

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full text-sm">
        <caption className="sr-only">{label} time series</caption>
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Period end</th>
            <th className="px-4 py-3 font-medium">Frequency</th>
            <th className="px-4 py-3 font-medium">Value</th>
            <th className="px-4 py-3 font-medium">QoQ</th>
            <th className="px-4 py-3 font-medium">YoY</th>
            <th className="px-4 py-3 font-medium">Flag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {[...points].reverse().map((point) => (
            <tr key={`${point.x}-${point.frequency}`} className={point.anomaly ? "bg-red-50/60" : undefined}>
              <td className="px-4 py-3 font-mono text-zinc-900">{point.x}</td>
              <td className="px-4 py-3 capitalize text-zinc-600">{point.frequency}</td>
              <td className="px-4 py-3 font-mono font-medium text-zinc-900">
                {formatMetricValue(metric, point.y)}
              </td>
              <td className="px-4 py-3 font-mono text-zinc-700">
                {point.frequency === "quarterly" ? formatDeltaPercent(point.delta_qoq) : "—"}
              </td>
              <td className="px-4 py-3 font-mono text-zinc-700">{formatDeltaPercent(point.delta_yoy)}</td>
              <td className="px-4 py-3">
                {point.anomaly ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Anomaly
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
