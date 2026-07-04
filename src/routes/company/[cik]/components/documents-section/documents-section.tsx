"use client";

import { useState, type ReactNode } from "react";
import { DocumentsView } from "@/routes/company/[cik]/features/filings/views/documents-view";
import { FilingsTimeline } from "@/routes/company/[cik]/features/filings/views/timeline-view";
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
  enabled: boolean;
  initialView?: "list" | "timeline";
};

type DocumentsViewMode = "list" | "timeline";

export function DocumentsSection({
  cik,
  companyName,
  ticker,
  filings,
  totalShown,
  hasMoreFilings,
  timeline,
  fiscalYearEnd,
  enabled,
  initialView = "timeline",
}: DocumentsSectionProps) {
  const [view, setView] = useState<DocumentsViewMode>(initialView);

  if (!enabled) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center border-b border-zinc-200 px-5 py-2.5">
        <div className="inline-flex gap-0.5 rounded-[10px] bg-zinc-100 p-0.5">
          <ViewToggle active={view === "list"} onClick={() => setView("list")}>
            List
          </ViewToggle>
          <ViewToggle active={view === "timeline"} onClick={() => setView("timeline")}>
            Timeline
          </ViewToggle>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "list" ? (
          <DocumentsView
            cik={cik}
            filings={filings}
            totalShown={totalShown}
            hasMoreFilings={hasMoreFilings}
            enabled={enabled}
          />
        ) : (
          <FilingsTimeline
            cik={cik}
            companyName={companyName}
            timeline={timeline}
            fiscalYearEnd={fiscalYearEnd}
            ticker={ticker}
            enabled={enabled}
          />
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[52px] rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold transition",
        active
          ? "bg-white text-zinc-900 shadow-sm"
          : "text-zinc-500 hover:text-zinc-700",
      )}
    >
      {children}
    </button>
  );
}
