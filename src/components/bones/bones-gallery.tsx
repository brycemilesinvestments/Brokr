"use client";

import { CompanyAnalysisLoading } from "./company-analysis-loading";
import { FilingsAnalysisProgress } from "./filings-analysis-progress";
import { FILINGS_ANALYSIS_PROGRESS_FIXTURE } from "./filings-analysis-progress-fixture";
import { PeersComparisonLoading } from "./peers-comparison-loading";
import { FilingTableRow } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/components/filing-table-row";
import { FILING_ROW_FIXTURE } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/components/filing-row-fixture";

/** Renders every registered skeleton in loading state for `npm run bones:build`. */
export function BonesGallery() {
  return (
    <div className="min-h-screen space-y-16 bg-zinc-50 p-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Filing rows
        </h2>
        <table className="min-w-full table-fixed divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white text-sm shadow-sm">
          <tbody>
            <FilingTableRow
              cik="0000789019"
              filing={FILING_ROW_FIXTURE}
              analysisStatus="analyzing"
              analysisError={null}
            />
            <FilingTableRow
              cik="0000789019"
              filing={{ ...FILING_ROW_FIXTURE, type: "10-K" }}
              analysisStatus="queued-analyze"
              analysisError={null}
            />
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Analysis progress
        </h2>
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <FilingsAnalysisProgress progress={FILINGS_ANALYSIS_PROGRESS_FIXTURE} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Company analysis panel
        </h2>
        <CompanyAnalysisLoading />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Peers comparison panel
        </h2>
        <PeersComparisonLoading />
      </section>
    </div>
  );
}
