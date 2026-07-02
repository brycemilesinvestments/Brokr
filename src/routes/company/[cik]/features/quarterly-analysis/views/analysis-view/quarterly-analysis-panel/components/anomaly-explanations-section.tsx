import type { AnomalyExplanation } from "@/lib/orchestrate";

type AnomalyExplanationsSectionProps = {
  explanations: AnomalyExplanation[];
};

const CONFIDENCE_STYLES = {
  high: "text-emerald-700",
  medium: "text-amber-700",
  low: "text-zinc-500",
} as const;

export function AnomalyExplanationsSection({ explanations }: AnomalyExplanationsSectionProps) {
  if (explanations.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">AI anomaly explanations</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Explanations generated only for flagged cross-layer anomalies.
      </p>
      <ul className="mt-3 space-y-4">
        {explanations.map((item) => (
          <li
            key={item.anomalyId}
            className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3"
          >
            <p className="font-mono text-xs text-zinc-500">Anomaly {item.anomalyId}</p>
            {item.excerpt ? (
              <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs leading-5 text-zinc-600">
                {item.excerpt}
              </p>
            ) : null}
            {item.explanation.refused ? (
              <p className="mt-2 text-sm text-zinc-500">Explanation refused by AI policy.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {item.explanation.explanations.map((entry) => (
                  <li key={`${entry.category}-${entry.summary.slice(0, 32)}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-800">
                        {entry.category.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-xs font-medium capitalize ${CONFIDENCE_STYLES[entry.confidence]}`}
                      >
                        {entry.confidence} confidence
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-700">{entry.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
