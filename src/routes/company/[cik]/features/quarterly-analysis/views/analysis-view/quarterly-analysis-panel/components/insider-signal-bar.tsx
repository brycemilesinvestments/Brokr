import type { EventStudyResult } from "@/lib/insider";
import { MINIMUM_SIGNAL_EVENTS } from "@/lib/insider";

type InsiderSignalBarProps = {
  insider: EventStudyResult;
};

function formatCar(value: number): string {
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function windowMeanCar(
  insider: Extract<EventStudyResult, { status: "complete" }>,
  label: "short" | "medium" | "long",
): number | null {
  const rows = insider.aggregations.filter((row) => row.window.label === label);
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + row.meanCar, 0) / rows.length;
}

const WINDOW_LABELS = [
  { key: "short" as const, label: "Short · 5d" },
  { key: "medium" as const, label: "Medium · 20d" },
  { key: "long" as const, label: "Long · 60d" },
];

export function InsiderSignalBar({ insider }: InsiderSignalBarProps) {
  if (insider.status === "insufficient_signal") {
    return (
      <div className="mx-6 mb-0 mt-3 flex flex-wrap items-center gap-5 rounded-xl border border-zinc-200 bg-zinc-50 px-[18px] py-3.5">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-zinc-300">
            Insider signal
          </p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-zinc-900">
            Insufficient signal · {insider.signalEventCount} events
          </p>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Need at least {insider.minimumRequired ?? MINIMUM_SIGNAL_EVENTS} classified signal events.
        </p>
      </div>
    );
  }

  const windows = WINDOW_LABELS.map((window) => ({
    ...window,
    value: windowMeanCar(insider, window.key),
  }));

  const longCar = windows.find((window) => window.key === "long")?.value;
  const note =
    longCar !== null && longCar !== undefined
      ? longCar > 0.1
        ? "Long-horizon insider signals are strongly positive."
        : longCar < -0.05
          ? "Long-horizon insider signals lean negative."
          : "Long-horizon insider signals are mixed."
      : "Insider event study complete — review CAR windows below.";

  return (
    <div className="mx-6 mb-0 mt-3 flex flex-wrap items-center gap-5 rounded-xl border border-zinc-200 bg-zinc-50 px-[18px] py-3.5">
      <div>
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-zinc-300">
          Insider signal
        </p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-zinc-900">
          {insider.signalEvents.length} signal · {insider.noiseEvents.length} noise events
        </p>
      </div>

      <span className="hidden h-[30px] w-px bg-zinc-200 sm:block" aria-hidden />

      {windows.map((window) =>
        window.value === null ? null : (
          <div key={window.key}>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-zinc-400">
              {window.label}
            </p>
            <p
              className={`mt-0.5 font-mono text-sm font-bold ${
                window.value >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatCar(window.value)}
            </p>
          </div>
        ),
      )}

      <p className="min-w-[180px] flex-1 text-right text-[11px] leading-relaxed text-zinc-400">
        {note}
      </p>
    </div>
  );
}
