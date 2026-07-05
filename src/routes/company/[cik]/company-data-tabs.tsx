"use client";

import { useEffect, useState } from "react";
import { AskFilingsOverlay } from "@/routes/company/[cik]/features/rag-chat";
import { CompanyContentHeader } from "@/routes/company/[cik]/components/company-content-header/company-content-header";
import {
  parseLocationHash,
  sidebarTabForValue,
  TAB_TITLES,
  tabToHash,
  type CompanyNavTab,
  type CompanyTabValue,
} from "@/routes/company/[cik]/components/company-nav/constants";
import { CompanySidebar } from "@/routes/company/[cik]/components/company-sidebar/company-sidebar";
import { CompanySidebarMenuButton } from "@/routes/company/[cik]/components/company-sidebar/company-sidebar-menu-button";
import { DocumentsSection } from "@/routes/company/[cik]/components/documents-section/documents-section";
import { GuidancePanel } from "@/routes/company/[cik]/features/guidance";
import { HealthPanel } from "@/routes/company/[cik]/features/health";
import { InsiderTransactionsTable } from "@/routes/company/[cik]/features/insider-transactions/views/insider-view/insider-transactions-table";
import { OutstandingSharesChart } from "@/routes/company/[cik]/features/outstanding-shares/views/shares-view";
import { PatternsPanel } from "@/routes/company/[cik]/features/patterns";
import { PeersPanel } from "@/routes/company/[cik]/features/peers";
import { FinancialTrendsPanel } from "@/routes/company/[cik]/features/financial-trends";
import { FredPanel } from "@/routes/company/[cik]/features/fred";
import { QuarterlyAnalysisPanel } from "@/routes/company/[cik]/features/quarterly-analysis";
import type { FinancialTrendsPayload } from "@/routes/company/[cik]/features/financial-trends/types";
import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";
import type { Filing } from "@/routes/company/[cik]/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

type CompanyDataTabsProps = {
  cik: string;
  companyName: string;
  ticker?: string;
  timeline: TimelineFiling[];
  fiscalYearEnd?: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings?: boolean;
  insider?: {
    transactions: InsiderTransaction[];
    totalShown: number;
    secUrl: string;
  } | null;
  outstandingShares: OutstandingSharePoint[];
  financialTrends: FinancialTrendsPayload | null;
};

export function CompanyDataTabs({
  cik,
  companyName,
  ticker,
  timeline,
  fiscalYearEnd,
  filings,
  totalShown,
  hasMoreFilings,
  insider,
  outstandingShares,
  financialTrends,
}: CompanyDataTabsProps) {
  const [activeTab, setActiveTab] = useState<CompanyTabValue>("analysis");
  const [fredSeriesId, setFredSeriesId] = useState<string | null>(null);
  const [isHashReady, setIsHashReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [companySidebarOpen, setCompanySidebarOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCompanySidebarOpen(true);
    }
  }, []);
  const displayedTab = isHashReady ? activeTab : "analysis";
  const sidebarTab: CompanyNavTab = sidebarTabForValue(displayedTab) ?? "analysis";
  const documentsInitialView = displayedTab === "documents" ? "list" : "timeline";
  const isDocumentsPanel = displayedTab === "documents" || displayedTab === "timeline";
  const isFredDashboard = displayedTab === "fred";
  const isAnalysisDashboard = displayedTab === "analysis";

  const [prevInsider, setPrevInsider] = useState(insider);
  if (insider !== prevInsider) {
    setPrevInsider(insider);
    if (activeTab === "insider" && !insider) {
      setActiveTab("analysis");
    }
  }

  useEffect(() => {
    function syncFromHash() {
      const { tab, fredSeriesId: nextFredSeriesId } = parseLocationHash(window.location.hash);
      if (tab === "insider" && !insider) {
        setActiveTab("analysis");
        setFredSeriesId(null);
        return;
      }
      if (tab === "chat") {
        setChatOpen(true);
        return;
      }
      if (tab) {
        setActiveTab(tab);
        setFredSeriesId(nextFredSeriesId);
        setChatOpen(false);
      }
    }

    syncFromHash();
    setIsHashReady(true);
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [insider]);

  function navigateTo(tab: CompanyNavTab) {
    const resolvedTab: CompanyTabValue = tab === "documents" ? "timeline" : tab;
    setActiveTab(resolvedTab);
    setIsHashReady(true);
    setCompanySidebarOpen(false);
    if (tab !== "fred") {
      setFredSeriesId(null);
    }
    setChatOpen(false);
    const hash = tab === "documents" ? "#timeline" : tabToHash(tab);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }

  function handleFredSeriesChange(seriesId: string | null) {
    setFredSeriesId(seriesId);
    if (!seriesId) return;

    const hash = tabToHash("fred", seriesId);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }

  function handleChatOpenChange(open: boolean) {
    setChatOpen(open);
    if (open) {
      const hash = tabToHash("chat");
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", hash);
      }
      return;
    }

    const restoreTab = displayedTab === "timeline" ? "timeline" : displayedTab;
    const hash = tabToHash(restoreTab, fredSeriesId);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }

  const headerTitle =
    displayedTab === "documents" || displayedTab === "timeline"
      ? TAB_TITLES.documents
      : TAB_TITLES[displayedTab];

  const sidebarMenuButton = !companySidebarOpen ? (
    <CompanySidebarMenuButton onClick={() => setCompanySidebarOpen(true)} />
  ) : null;

  function renderPanel() {
    switch (displayedTab) {
      case "analysis":
        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!companySidebarOpen ? (
              <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-zinc-200 bg-white px-5">
                {sidebarMenuButton}
              </div>
            ) : null}
            <QuarterlyAnalysisPanel cik={cik} ticker={ticker} />
          </div>
        );
      case "peers":
        return <PeersPanel cik={cik} ticker={ticker} enabled />;
      case "health":
        return <HealthPanel cik={cik} enabled />;
      case "patterns":
        return <PatternsPanel cik={cik} enabled />;
      case "guidance":
        return <GuidancePanel cik={cik} enabled />;
      case "trends":
        return financialTrends ? (
          <FinancialTrendsPanel data={financialTrends} />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 py-8">
            <h2 className="text-lg font-semibold text-zinc-900">Financial trends</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Could not load time series data from SEC company facts.
            </p>
          </section>
        );
      case "shares":
        return <OutstandingSharesChart points={outstandingShares} />;
      case "insider":
        return insider ? (
          <InsiderTransactionsTable
            transactions={insider.transactions}
            totalShown={insider.totalShown}
            secUrl={insider.secUrl}
            ticker={ticker}
          />
        ) : null;
      case "fred":
        return (
          <FredPanel
            enabled
            ticker={ticker}
            selectedSeriesId={fredSeriesId}
            onSelectedSeriesIdChange={handleFredSeriesChange}
            headerLeading={sidebarMenuButton}
          />
        );
      case "documents":
      case "timeline":
        return (
          <DocumentsSection
            key={documentsInitialView}
            cik={cik}
            companyName={companyName}
            ticker={ticker}
            filings={filings}
            totalShown={totalShown}
            hasMoreFilings={hasMoreFilings}
            timeline={timeline}
            fiscalYearEnd={fiscalYearEnd}
            enabled
            initialView={documentsInitialView}
            headerLeading={sidebarMenuButton}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-50">
      <CompanySidebar
        companyName={companyName}
        ticker={ticker}
        activeTab={sidebarTab}
        showInsider={Boolean(insider)}
        open={companySidebarOpen}
        onClose={() => setCompanySidebarOpen(false)}
        onNavigate={navigateTo}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isFredDashboard || isDocumentsPanel || isAnalysisDashboard ? (
          renderPanel()
        ) : (
          <>
            <CompanyContentHeader
              ticker={ticker}
              title={headerTitle}
              leading={sidebarMenuButton}
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{renderPanel()}</div>
          </>
        )}
      </div>

      <AskFilingsOverlay
        cik={cik}
        companyName={companyName}
        ticker={ticker}
        filings={filings}
        open={chatOpen}
        onOpenChange={handleChatOpenChange}
      />
    </div>
  );
}
