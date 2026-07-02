import Link from "next/link";
import type { FilingDetailPage } from "@/routes/company/[cik]/filing/[accession]/types";

type FilingHeaderProps = {
  filing: FilingDetailPage;
  companyName?: string;
};

export function FilingHeader({ filing, companyName }: FilingHeaderProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
        SEC EDGAR Filing
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
        Form {filing.formType}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">{filing.formDescription}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs">
          {filing.accessionNumber}
        </span>
        {companyName ? (
          <span className="rounded-full bg-zinc-100 px-3 py-1">{companyName}</span>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {filing.filingDate ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Filing date
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{filing.filingDate}</dd>
          </div>
        ) : null}
        {filing.accepted ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Accepted
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{filing.accepted}</dd>
          </div>
        ) : null}
        {filing.periodOfReport ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Period of report
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{filing.periodOfReport}</dd>
          </div>
        ) : null}
        {filing.documentCount ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Documents
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{filing.documentCount}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={filing.secUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          View on SEC.gov
        </a>
        <Link
          href={`/company/${filing.cik}`}
          className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          Back to company filings
        </Link>
      </div>
    </section>
  );
}
