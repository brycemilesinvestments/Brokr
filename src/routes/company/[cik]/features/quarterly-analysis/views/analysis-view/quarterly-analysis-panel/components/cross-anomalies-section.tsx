import type { CrossLayerAnomaly } from "@/lib/orchestrate";

type CrossAnomaliesSectionProps = {
  anomalies: CrossLayerAnomaly[];
};

const LAYER_STYLES: Record<string, string> = {
  fundamentals: "bg-blue-100 text-blue-800",
  valuation: "bg-violet-100 text-violet-800",
  insider: "bg-amber-100 text-amber-800",
  cross_layer: "bg-red-100 text-red-800",
};

export function CrossAnomaliesSection({ anomalies }: CrossAnomaliesSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">Cross-layer anomalies</h3>
      {anomalies.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No cross-layer anomalies flagged.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {anomalies.map((anomaly) => (
            <li
              key={anomaly.id}
              className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-600">{anomaly.date}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium capitalize text-red-800">
                  {anomaly.type.replace(/_/g, " ")}
                </span>
                {anomaly.layers.map((layer) => (
                  <span
                    key={layer}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${LAYER_STYLES[layer] ?? "bg-zinc-100 text-zinc-700"}`}
                  >
                    {layer.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-zinc-700">{anomaly.description}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Magnitude {(anomaly.magnitude * 100).toFixed(1)}%
                {anomaly.chartKeys.length > 0
                  ? ` · charts: ${anomaly.chartKeys.join(", ")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
