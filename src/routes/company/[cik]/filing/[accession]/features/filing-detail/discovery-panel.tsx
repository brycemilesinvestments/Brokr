import type { FilingDiscoveryOutput } from "@/lib/orchestrate/filing-discovery";
import type { ConceptTag } from "@/lib/edgar/discovery";

const TAG_LABELS: Record<ConceptTag, string> = {
  core: "Core (whitelisted)",
  known_useful: "Known useful",
  company_specific: "Company-specific",
  ignorable: "Ignorable",
};

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

type DiscoveryPanelProps = {
  discovery: FilingDiscoveryOutput;
};

export function DiscoveryPanel({ discovery }: DiscoveryPanelProps) {
  const tagCounts = discovery.classifications.reduce(
    (acc, c) => {
      acc[c.tag] = (acc[c.tag] ?? 0) + 1;
      return acc;
    },
    {} as Record<ConceptTag, number>,
  );

  const proseFound = Object.values(discovery.proseSections).filter(Boolean).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Concept Discovery</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Coverage against full XBRL universe — deterministic layer always runs; AI prose signals
        cached per filing.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Whitelist coverage"
          value={`${discovery.coverage.whitelistPresent} of ${discovery.coverage.universeTotal}`}
        />
        <StatCard label="Universe concepts" value={String(discovery.universe.length)} />
        <StatCard label="Prose sections" value={String(proseFound)} />
        <StatCard
          label="AI signals"
          value={
            discovery.qualitativeSignals === "skipped_budget"
              ? "Skipped (budget)"
              : discovery.cacheHit
                ? "Cached"
                : discovery.qualitativeSignals
                  ? "Extracted"
                  : "None"
          }
        />
      </div>

      {discovery.coverage.unsurfaced.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-700">Top unsurfaced concepts</h3>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
            {discovery.coverage.unsurfaced.slice(0, 8).map((item) => (
              <li
                key={`${item.taxonomy}:${item.concept}`}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span className="font-mono text-zinc-800">
                  {item.taxonomy}:{item.concept}
                </span>
                <span className="text-zinc-500">{item.dataPointCount} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-700">Classification breakdown</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(TAG_LABELS) as ConceptTag[]).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
            >
              {TAG_LABELS[tag]}: {tagCounts[tag] ?? 0}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-zinc-700">Forward numeric signals</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <SignalRow
            label="Backlog (RPO)"
            status={discovery.forwardSignals.backlog.status}
          />
          <SignalRow
            label="Customer concentration"
            status={discovery.forwardSignals.customerConcentration.status}
          />
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Segment growth rates</dt>
            <dd className="mt-1 text-zinc-800">
              {discovery.forwardSignals.segmentGrowth.length === 0
                ? "not_reported"
                : discovery.forwardSignals.segmentGrowth
                    .slice(0, 4)
                    .map(
                      (s) =>
                        `${s.segmentName} (${s.dimension}): ${formatPct(s.growthRate)}`,
                    )
                    .join(" · ")}
            </dd>
          </div>
        </dl>
      </div>

      {discovery.crossCheckResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-zinc-700">Cross-checks</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {discovery.crossCheckResults.map((check) => (
              <li
                key={check.field}
                className={check.agrees ? "text-emerald-700" : "text-amber-700"}
              >
                {check.field}:{" "}
                {check.agrees
                  ? "agrees"
                  : (check.message ?? "mismatch flagged for review")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {discovery.qualitativeSignals &&
        discovery.qualitativeSignals !== "skipped_budget" &&
        discovery.qualitativeSignals.sections.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-zinc-700">Qualitative signals</h3>
            <ul className="mt-2 space-y-3">
              {discovery.qualitativeSignals.sections.map((section) => (
                <li
                  key={section.section}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium capitalize">
                    {section.section.replace(/_/g, " ")}
                  </span>
                  {section.outlook?.found && section.outlook.summary && (
                    <p className="mt-1 text-zinc-600">{section.outlook.summary}</p>
                  )}
                  {section.customers?.found && section.customers.named_customers && (
                    <p className="mt-1 text-zinc-600">
                      Customers: {section.customers.named_customers.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

function SignalRow({ label, status }: { label: string; status: string }) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-800">{status}</dd>
    </>
  );
}
