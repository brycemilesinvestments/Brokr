import type { CoverageReport } from "@/lib/orchestrate";

type CoverageReportCardProps = {
  coverage: CoverageReport;
  completed: boolean;
  ticker?: string;
};

function formatRange(range?: { earliest: string; latest: string; pointCount: number }): string {
  if (!range) return "—";
  return `${range.earliest} → ${range.latest} (${range.pointCount} points)`;
}

export function CoverageReportCard({ coverage, completed, ticker }: CoverageReportCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Coverage report</h3>
          <p className="mt-1 text-sm text-zinc-600">
            {coverage.entityName}
            {ticker ? ` (${ticker})` : ""} · CIK {coverage.cik}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
            completed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
          }`}
        >
          {completed ? "Complete" : "Partial"}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Fundamentals</dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {coverage.metricsReported} / {coverage.metricsTotal} metrics
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Quarterly range</dt>
          <dd className="mt-1 text-sm text-zinc-700">{formatRange(coverage.quarterlyRange)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Annual range</dt>
          <dd className="mt-1 text-sm text-zinc-700">{formatRange(coverage.annualRange)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Segments</dt>
          <dd className="mt-1 text-sm text-zinc-700">
            {coverage.segments.endMarketWithData} end-market · {coverage.segments.geographyWithData}{" "}
            geography
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Insider study</dt>
          <dd className="mt-1 text-sm text-zinc-700">
            {coverage.insiderStatus === "complete"
              ? `${coverage.insiderSignalEventCount} signal events`
              : `${coverage.insiderSignalEventCount} events (insufficient signal)`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Valuation</dt>
          <dd className="mt-1 text-sm text-zinc-700">
            {coverage.valuationAvailable ? "Available" : "Unavailable (no ticker/prices)"}
          </dd>
        </div>
      </dl>

      {coverage.warnings.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {coverage.warnings.map((warning) => (
            <li
              key={warning}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
