import Link from "next/link";
import type { FilingParty } from "@/routes/company/[cik]/filing/[accession]/types";

type FilersSectionProps = {
  parties: FilingParty[];
};

export function FilersSection({ parties }: FilersSectionProps) {
  if (parties.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Filers</h2>
      {parties.map((party) => (
        <article
          key={`${party.cik ?? party.name}-${party.role ?? "party"}`}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">{party.name}</h3>
            {party.role ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {party.role}
              </span>
            ) : null}
            {party.cik ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs text-zinc-500">
                CIK {party.cik}
              </span>
            ) : null}
          </div>

          {party.identInfo ? (
            <p className="mt-3 text-sm text-zinc-600">{party.identInfo}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {party.filingsUrl ? (
              <a
                href={party.filingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                SEC filings
              </a>
            ) : null}
            {party.cik ? (
              <Link
                href={`/company/${party.cik}`}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
              >
                View in app
              </Link>
            ) : null}
          </div>

          {(party.mailingAddress.length > 0 || party.businessAddress.length > 0) && (
            <div className="mt-4 grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2">
              {party.mailingAddress.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900">Mailing address</h4>
                  <address className="mt-2 not-italic text-sm leading-6 text-zinc-600">
                    {party.mailingAddress.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </address>
                </div>
              ) : null}
              {party.businessAddress.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900">Business address</h4>
                  <address className="mt-2 not-italic text-sm leading-6 text-zinc-600">
                    {party.businessAddress.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </address>
                </div>
              ) : null}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
