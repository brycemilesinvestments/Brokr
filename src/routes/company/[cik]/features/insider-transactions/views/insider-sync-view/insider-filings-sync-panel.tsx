"use client";

import { Form345FilingsProgress } from "@/components/bones/filings-analysis-progress";
import { FilingTableRow } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/components/filing-table-row";
import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Form345PipelineProgress } from "@/routes/company/[cik]/hooks/use-form345-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";

type InsiderFilingsSyncPanelProps = {
  cik: string;
  filings: Filing[];
  progress: Form345PipelineProgress;
  loadingFilings: boolean;
  getStatus: (accessionNumber: string | undefined, formType?: string) => FilingWorkStatus;
  getError: (accessionNumber: string | undefined) => string | null;
};

function countLabel(filings: Filing[], loadingFilings: boolean): string {
  if (loadingFilings) {
    return "Discovering Form 3/4/5 filings from SEC EDGAR…";
  }
  if (filings.length === 0) {
    return "No Form 3/4/5 filings found for this company.";
  }
  return `${filings.length} Form 3/4/5 filings to ingest`;
}

export function InsiderFilingsSyncPanel({
  cik,
  filings,
  progress,
  loadingFilings,
  getStatus,
  getError,
}: InsiderFilingsSyncPanelProps) {
  const showProgress = progress.active || progress.error > 0 || loadingFilings;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <section className="shrink-0 border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Syncing insider filings</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Syncing Form 3/4/5 filings from SEC EDGAR…
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Parsing ownership XML, classifying transactions, and caching footnotes.
        </p>
        {showProgress ? (
          loadingFilings ? (
            <p className="mt-2 text-sm text-sky-800">Discovering filings to ingest…</p>
          ) : (
            <Form345FilingsProgress progress={progress} />
          )
        ) : null}
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="shrink-0 border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Filings to ingest</h3>
          <p className="mt-1 text-sm text-zinc-500">{countLabel(filings, loadingFilings)}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loadingFilings ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading Form 3/4/5 filing list…
            </div>
          ) : filings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No Form 3/4/5 filings found for this company.
            </div>
          ) : (
            <table className="min-w-full table-fixed divide-y divide-zinc-100 text-sm">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[36%]" />
                <col className="w-[12%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Form</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Filed</th>
                  <th className="px-6 py-3">Accession</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filings.map((filing) => (
                  <FilingTableRow
                    key={`${filing.accessionNumber ?? filing.filingDate}-${filing.type}`}
                    cik={cik}
                    filing={filing}
                    analysisStatus={getStatus(filing.accessionNumber, filing.type)}
                    analysisError={getError(filing.accessionNumber)}
                    analysisLabelFormType={filing.type}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
