"use client";

import { useEffect, useRef } from "react";
import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";
import { InsiderFilingsSyncPanel } from "@/routes/company/[cik]/features/insider-transactions/views/insider-sync-view/insider-filings-sync-panel";
import { InsiderTransactionsTable } from "@/routes/company/[cik]/features/insider-transactions/views/insider-view/insider-transactions-table";
import { useForm345FilingsList } from "@/routes/company/[cik]/hooks/use-form345-filings-list";
import { useForm345Pipeline } from "@/routes/company/[cik]/hooks/use-form345-pipeline";
import { useInsiderPage } from "@/routes/company/[cik]/hooks/use-insider-page";

export function InsiderPageContent() {
  const { cik, ticker } = useCompanyLayoutShell();
  const {
    filings: form345Filings,
    loading: loadingFilings,
    error: filingsListError,
  } = useForm345FilingsList(cik, true);
  const { getStatus, getError, progress } = useForm345Pipeline(
    cik,
    form345Filings,
    !loadingFilings && form345Filings.length > 0,
  );
  const { page, loading: loadingPage, error: pageError, reload } = useInsiderPage(cik, true);

  const pipelineComplete = !progress.active && progress.phase !== "idle" && progress.phase !== "loading-status";
  const syncActive =
    loadingFilings ||
    loadingPage ||
    progress.active ||
    (!pipelineComplete && form345Filings.length > 0);

  const pipelineWasActiveRef = useRef(false);

  useEffect(() => {
    if (progress.active) {
      pipelineWasActiveRef.current = true;
      return;
    }

    if (!pipelineWasActiveRef.current || progress.phase !== "complete") return;
    pipelineWasActiveRef.current = false;
    reload();
  }, [progress.active, progress.phase, reload]);

  const error = filingsListError ?? pageError;

  if (error) {
    return (
      <CompanyPanelPage title="Insider transactions">
        <div className="px-5 py-8 text-sm text-red-600">{error}</div>
      </CompanyPanelPage>
    );
  }

  if (syncActive) {
    return (
      <CompanyPanelPage title="Insider transactions">
        <InsiderFilingsSyncPanel
          cik={cik}
          filings={form345Filings}
          progress={progress}
          loadingFilings={loadingFilings}
          getStatus={getStatus}
          getError={getError}
        />
      </CompanyPanelPage>
    );
  }

  if (!page || page.transactions.length === 0) {
    return (
      <CompanyPanelPage title="Insider transactions">
        <div className="px-5 py-8 text-sm text-zinc-500">
          No insider ownership filings found for this company yet.
        </div>
      </CompanyPanelPage>
    );
  }

  return (
    <CompanyPanelPage title="Insider transactions">
      <InsiderTransactionsTable
        transactions={page.transactions}
        totalShown={page.totalShown}
        secUrl={page.secUrl}
        ticker={ticker}
      />
    </CompanyPanelPage>
  );
}
