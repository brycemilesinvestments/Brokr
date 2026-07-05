import type { CompanyAnalysisOutput } from "@/lib/orchestrate";

type AnalysisStatusFooterProps = {
  data: CompanyAnalysisOutput;
};

export function AnalysisStatusFooter({ data }: AnalysisStatusFooterProps) {
  const passedChecks = data.contract.checks.filter((check) => check.passed).length;
  const totalChecks = data.contract.checks.length;
  const quarterlyPoints = data.coverage.quarterlyRange?.pointCount ?? 0;
  const gapCount = data.metrics.missing.length;
  const complete = data.completed && data.terminatedReason === "complete";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-zinc-100 bg-zinc-50 px-6 py-3.5 font-mono text-[10.5px] font-medium text-zinc-400">
      <span className={complete ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
        {complete ? "✓ COMPLETE" : "⚠ PARTIAL"}
      </span>
      <span>
        {data.coverage.metricsReported} / {data.coverage.metricsTotal} fundamentals
      </span>
      <span>
        {passedChecks} / {totalChecks} series checks
      </span>
      <span>{quarterlyPoints} quarterly pts</span>
      {gapCount > 0 ? (
        <span className="ml-auto text-amber-700">
          ⚠ {gapCount} derived-metric gaps
          {gapCount > 0 && data.metrics.missing[0]?.reason
            ? ` (${data.metrics.missing[0].reason})`
            : ""}
        </span>
      ) : null}
    </div>
  );
}
