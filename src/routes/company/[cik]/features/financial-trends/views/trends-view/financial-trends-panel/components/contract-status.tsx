import type { ContractValidation, SeriesAnomaly } from "@/lib/analysis";

type ContractStatusProps = {
  contract: ContractValidation;
};

export function ContractStatus({ contract }: ContractStatusProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        contract.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            contract.passed ? "text-emerald-800" : "text-amber-900"
          }`}
        >
          {contract.passed ? "Series validated" : "Validation issues"}
        </span>
        <span className="text-xs text-zinc-600">
          {contract.checks.filter((c) => c.passed).length}/{contract.checks.length} checks passed
        </span>
      </div>
      {!contract.passed ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-900">
          {contract.checks
            .filter((c) => !c.passed && c.id !== "C11")
            .map((c) => (
              <li key={c.id}>
                <span className="font-mono font-medium">{c.id}</span>: {c.message}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

type AnomaliesTimelineProps = {
  anomalies: SeriesAnomaly[];
  metric?: string;
};

export function AnomaliesTimeline({ anomalies, metric }: AnomaliesTimelineProps) {
  const filtered = metric
    ? anomalies.filter((a) => a.metric === metric || (metric === "RevenueFromContractWithCustomerExcludingAssessedTax" && a.metric === "revenue"))
    : anomalies;

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No anomalies flagged across the full series for this view.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {filtered.map((anomaly) => (
        <li
          key={`${anomaly.periodEnd}-${anomaly.metric}-${anomaly.type}`}
          className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-zinc-600">{anomaly.periodEnd}</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium capitalize text-red-800">
              {anomaly.type.replace(/_/g, " ")}
            </span>
            <span className="text-xs capitalize text-zinc-500">{anomaly.frequency}</span>
          </div>
          <p className="mt-1 text-zinc-700">
            {anomaly.metric.replace(/_/g, " ")} · magnitude {(anomaly.magnitude * 100).toFixed(1)}%
          </p>
        </li>
      ))}
    </ul>
  );
}
