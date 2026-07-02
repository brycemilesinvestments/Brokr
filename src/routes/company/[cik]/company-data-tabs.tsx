"use client";

import { useEffect, useState } from "react";
import { DocumentsView } from "@/routes/company/[cik]/features/filings/views/documents-view";
import { FilingsTimeline } from "@/routes/company/[cik]/features/filings/views/timeline-view";
import { GuidancePanel } from "@/routes/company/[cik]/features/guidance";
import { HealthPanel } from "@/routes/company/[cik]/features/health";
import { InsiderTransactionsTable } from "@/routes/company/[cik]/features/insider-transactions/views/insider-view/insider-transactions-table";
import { OutstandingSharesChart } from "@/routes/company/[cik]/features/outstanding-shares/views/shares-view";
import { PatternsPanel } from "@/routes/company/[cik]/features/patterns";
import { PeersPanel } from "@/routes/company/[cik]/features/peers";
import { FinancialTrendsPanel } from "@/routes/company/[cik]/features/financial-trends";
import { QuarterlyAnalysisPanel } from "@/routes/company/[cik]/features/quarterly-analysis";
import { RagChatPanel } from "@/routes/company/[cik]/features/rag-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  insider?: {
    transactions: InsiderTransaction[];
    totalShown: number;
    secUrl: string;
  } | null;
  outstandingShares: OutstandingSharePoint[];
  financialTrends: FinancialTrendsPayload | null;
};

type TabValue =
  | "analysis"
  | "chat"
  | "peers"
  | "health"
  | "patterns"
  | "guidance"
  | "trends"
  | "shares"
  | "timeline"
  | "documents"
  | "insider";

const HASH_TO_TAB: Record<string, TabValue> = {
  "#analysis": "analysis",
  "#chat": "chat",
  "#ask": "chat",
  "#peers": "peers",
  "#health": "health",
  "#patterns": "patterns",
  "#guidance": "guidance",
  "#financial-trends": "trends",
  "#trends": "trends",
  "#outstanding-shares": "shares",
  "#shares": "shares",
  "#insider-transactions": "insider",
  "#insider": "insider",
  "#documents": "documents",
};

function tabFromHash(hash: string): TabValue | null {
  return HASH_TO_TAB[hash] ?? null;
}

function initialTabFromHash(
  insider: CompanyDataTabsProps["insider"],
): TabValue {
  if (typeof window === "undefined") return "analysis";
  const tab = tabFromHash(window.location.hash);
  if (tab === "insider" && !insider) return "analysis";
  return tab ?? "analysis";
}

export function CompanyDataTabs({
  cik,
  companyName,
  ticker,
  timeline,
  fiscalYearEnd,
  filings,
  totalShown,
  insider,
  outstandingShares,
  financialTrends,
}: CompanyDataTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(() =>
    initialTabFromHash(insider),
  );
  const [prevInsider, setPrevInsider] = useState(insider);
  if (insider !== prevInsider) {
    setPrevInsider(insider);
    if (activeTab === "insider" && !insider) {
      setActiveTab("analysis");
    }
  }

  useEffect(() => {
    function syncFromHash() {
      const tab = tabFromHash(window.location.hash);
      if (tab === "insider" && !insider) return;
      if (tab) setActiveTab(tab);
    }

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [insider]);

  function handleTabChange(value: string) {
    const tab = value as TabValue;
    setActiveTab(tab);
    const hash =
      tab === "analysis"
        ? "#analysis"
        : tab === "chat"
          ? "#chat"
          : tab === "peers"
            ? "#peers"
            : tab === "health"
              ? "#health"
              : tab === "patterns"
                ? "#patterns"
                : tab === "guidance"
                  ? "#guidance"
          : tab === "trends"
          ? "#financial-trends"
          : tab === "insider"
          ? "#insider-transactions"
          : tab === "documents"
            ? "#documents"
          : tab === "shares"
            ? "#outstanding-shares"
            : "";
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash || window.location.pathname);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
      <TabsList variant="line" className="h-auto w-full justify-start gap-1 border-b border-zinc-200 bg-transparent p-0">
        <TabsTrigger
          value="analysis"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Analysis
        </TabsTrigger>
        <TabsTrigger
          value="chat"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Ask filings
        </TabsTrigger>
        <TabsTrigger
          value="peers"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Peers
        </TabsTrigger>
        <TabsTrigger
          value="health"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Health
        </TabsTrigger>
        <TabsTrigger
          value="patterns"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Patterns
        </TabsTrigger>
        <TabsTrigger
          value="guidance"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Guidance
        </TabsTrigger>
        <TabsTrigger
          value="trends"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          SEC trends
        </TabsTrigger>
        <TabsTrigger
          value="shares"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Outstanding shares
        </TabsTrigger>
        {insider ? (
          <TabsTrigger
            value="insider"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
          >
            Insider transactions
          </TabsTrigger>
        ) : null}
        <TabsTrigger
          value="timeline"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Document timeline
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 data-active:border-emerald-600 data-active:text-emerald-800 data-active:shadow-none after:hidden"
        >
          Documents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analysis" className="mt-0">
        {activeTab === "analysis" ? (
          <QuarterlyAnalysisPanel cik={cik} ticker={ticker} />
        ) : null}
      </TabsContent>

      <TabsContent value="chat" className="mt-0">
        {activeTab === "chat" ? (
          <RagChatPanel cik={cik} companyName={companyName} />
        ) : null}
      </TabsContent>

      <TabsContent value="peers" className="mt-0">
        <PeersPanel cik={cik} enabled={activeTab === "peers"} />
      </TabsContent>

      <TabsContent value="health" className="mt-0">
        <HealthPanel cik={cik} enabled={activeTab === "health"} />
      </TabsContent>

      <TabsContent value="patterns" className="mt-0">
        <PatternsPanel cik={cik} enabled={activeTab === "patterns"} />
      </TabsContent>

      <TabsContent value="guidance" className="mt-0">
        <GuidancePanel cik={cik} enabled={activeTab === "guidance"} />
      </TabsContent>

      <TabsContent value="trends" className="mt-0">
        {financialTrends ? (
          <FinancialTrendsPanel data={financialTrends} />
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Financial trends</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Could not load time series data from SEC company facts.
            </p>
          </section>
        )}
      </TabsContent>

      <TabsContent value="shares" className="mt-0">
        <OutstandingSharesChart points={outstandingShares} />
      </TabsContent>

      {insider ? (
        <TabsContent value="insider" className="mt-0">
          <InsiderTransactionsTable
            transactions={insider.transactions}
            totalShown={insider.totalShown}
            secUrl={insider.secUrl}
          />
        </TabsContent>
      ) : null}

      <TabsContent value="timeline" className="mt-0">
        <FilingsTimeline
          cik={cik}
          timeline={timeline}
          fiscalYearEnd={fiscalYearEnd}
          ticker={ticker}
          enabled={activeTab === "timeline"}
        />
      </TabsContent>

      <TabsContent value="documents" className="mt-0">
        {activeTab === "documents" ? (
          <DocumentsView
            cik={cik}
            filings={filings}
            totalShown={totalShown}
            enabled={activeTab === "documents"}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
