import type { CompanyInfo } from "@/routes/company/[cik]/types";

type CompanyInfoCardProps = {
  info: CompanyInfo;
  secUrl: string;
  insiderUrl?: string;
  ticker?: string;
};

export function CompanyInfoCard({ info, secUrl, insiderUrl, ticker }: CompanyInfoCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            SEC EDGAR Company
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            {info.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-600">
            {ticker ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-mono font-medium">
                {ticker}
              </span>
            ) : null}
            <span className="rounded-full bg-zinc-100 px-3 py-1 font-mono">
              CIK {info.cik}
            </span>
            {info.sic ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1">
                SIC {info.sic}
                {info.sicDescription ? ` · ${info.sicDescription}` : ""}
              </span>
            ) : null}
            {info.state ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1">
                {info.state}
                {info.stateOfIncorporation ? ` · Inc. ${info.stateOfIncorporation}` : ""}
              </span>
            ) : null}
            {info.fiscalYearEnd ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1">
                FY end {info.fiscalYearEnd}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href={secUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            View on SEC.gov
          </a>
          <a
            href="#analysis"
            className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
          >
            Quarterly analysis
          </a>
          {insiderUrl ? (
            <a
              href={insiderUrl}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
            >
              Insider transactions
            </a>
          ) : null}
        </div>
      </div>

      {(info.businessAddress.length > 0 || info.phone) && (
        <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2">
          {info.businessAddress.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Business address</h2>
              <address className="mt-2 not-italic text-sm leading-6 text-zinc-600">
                {info.businessAddress.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                {info.phone ? <div>{info.phone}</div> : null}
              </address>
            </div>
          ) : null}
          {info.mailingAddress.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Mailing address</h2>
              <address className="mt-2 not-italic text-sm leading-6 text-zinc-600">
                {info.mailingAddress.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </address>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
