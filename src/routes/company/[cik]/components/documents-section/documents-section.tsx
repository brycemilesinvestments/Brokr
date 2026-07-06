"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { companyTabPath } from "@/routes/company/[cik]/lib/company-tab-paths";
import { DocumentsView } from "@/routes/company/[cik]/features/filings/views/documents-view";
import { FilingsTimeline } from "@/routes/company/[cik]/features/filings/views/timeline-view";
import { useCompanyFilings } from "@/routes/company/[cik]/hooks/use-company-filings";
import type { Filing } from "@/routes/company/[cik]/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { cn } from "@/lib/utils";

type DocumentsSectionProps = {
  cik: string;
  companyName: string;
  ticker?: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings?: boolean;
  timeline: TimelineFiling[];
  fiscalYearEnd?: string;
  view: "list" | "timeline";
  headerLeading?: ReactNode;
};

export function DocumentsSection({
  cik,
  companyName,
  ticker,
  filings,
  totalShown,
  hasMoreFilings,
  timeline,
  fiscalYearEnd,
  view,
  headerLeading,
}: DocumentsSectionProps) {
  const {
    filings: loadedFilings,
    totalShown: loadedTotalShown,
    hasMoreFilings: loadedHasMoreFilings,
    isLoadingMore,
    loadError,
    loadRemainingFilings,
  } = useCompanyFilings(cik, {
    initialFilings: filings,
    initialTotalShown: totalShown,
    initialHasMoreFilings: hasMoreFilings ?? false,
    enabled: true,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-5 py-2.5">
        {headerLeading}
        <div className="inline-flex gap-0.5 rounded-[10px] bg-zinc-100 p-0.5">
          <ViewToggle active={view === "list"} href={companyTabPath(cik, "list")}>
            List
          </ViewToggle>
          <ViewToggle active={view === "timeline"} href={companyTabPath(cik, "timeline")}>
            Timeline
          </ViewToggle>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "list" ? (
          <DocumentsView
            cik={cik}
            ticker={ticker}
            filings={loadedFilings}
            totalShown={loadedTotalShown}
            hasMoreFilings={loadedHasMoreFilings}
            isLoadingMore={isLoadingMore}
            loadError={loadError}
            loadRemainingFilings={loadRemainingFilings}
            enabled
          />
        ) : (
          <FilingsTimeline
            cik={cik}
            companyName={companyName}
            timeline={timeline}
            fiscalYearEnd={fiscalYearEnd}
            ticker={ticker}
            enabled
          />
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "min-w-[52px] rounded-lg px-3 py-1.5 text-center font-mono text-[11px] font-bold transition",
        active
          ? "bg-white text-zinc-900 shadow-sm"
          : "text-zinc-500 hover:text-zinc-700",
      )}
    >
      {children}
    </Link>
  );
}
