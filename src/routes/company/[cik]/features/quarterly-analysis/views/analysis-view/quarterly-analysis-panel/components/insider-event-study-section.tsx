import type { EventStudyResult } from "@/lib/insider";
import { MINIMUM_SIGNAL_EVENTS } from "@/lib/insider";

type InsiderEventStudySectionProps = {
  insider: EventStudyResult;
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function InsiderEventStudySection({ insider }: InsiderEventStudySectionProps) {
  if (insider.status === "insufficient_signal") {
    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Insider event study</h3>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
          <p className="text-sm font-medium text-zinc-900">Insufficient signal</p>
          <p className="mt-1 text-sm text-zinc-600">{insider.message}</p>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            {insider.signalEventCount} signal events · minimum {insider.minimumRequired ?? MINIMUM_SIGNAL_EVENTS}
          </p>
        </div>
      </div>
    );
  }

  const signalCount = insider.signalEvents.length;
  const noiseCount = insider.noiseEvents.length;

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">Insider event study</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Form 4 event study for {insider.symbol} — signal vs noise classification with cumulative
        abnormal returns.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Signal events</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-900">{signalCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Noise events</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900">{noiseCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total events</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-900">{insider.eventCount}</p>
        </div>
      </div>

      {insider.aggregations.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Signal type</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Events</th>
                <th className="px-4 py-3 font-medium">Mean CAR</th>
                <th className="px-4 py-3 font-medium">Hit rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {insider.aggregations.map((row) => (
                <tr key={`${row.signalType}-${row.window.label}`}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.signalType}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {row.window.label} ({row.window.endOffsetDays}d)
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{row.eventCount}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{formatPercent(row.meanCar)}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{formatPercent(row.hitRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {insider.signalDecay.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Signal decay</h4>
          <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Short CAR</th>
                  <th className="px-4 py-2 font-medium">Medium CAR</th>
                  <th className="px-4 py-2 font-medium">Long CAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {insider.signalDecay.map((row) => (
                  <tr key={row.signalType}>
                    <td className="px-4 py-2 font-medium text-zinc-900">{row.signalType}</td>
                    <td className="px-4 py-2 font-mono text-zinc-700">{formatPercent(row.shortCar)}</td>
                    <td className="px-4 py-2 font-mono text-zinc-700">{formatPercent(row.mediumCar)}</td>
                    <td className="px-4 py-2 font-mono text-zinc-700">{formatPercent(row.longCar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {insider.clusters.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Insider clusters ({insider.clusters.length})
          </h4>
          <ul className="mt-2 space-y-2">
            {insider.clusters.map((cluster) => (
              <li
                key={cluster.clusterId}
                className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-violet-700">{cluster.clusterId}</span>
                <span className="mx-2 text-zinc-400">·</span>
                {cluster.startDate} → {cluster.endDate}
                <span className="mx-2 text-zinc-400">·</span>
                {cluster.events.length} events
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
