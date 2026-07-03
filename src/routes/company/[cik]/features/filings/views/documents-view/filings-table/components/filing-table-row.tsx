"use client";

import { Skeleton } from "boneyard-js/react";
import { BONE_NAMES } from "@/components/bones/skeleton-names";
import type { FilingAnalysisStatus } from "@/routes/company/[cik]/hooks/use-filing-analysis-queue";
import type { Filing } from "@/routes/company/[cik]/types";
import { FILING_ROW_FIXTURE, FilingRowContent } from "./filing-row-content";

type FilingTableRowProps = {
  cik: string;
  filing: Filing;
  analysisStatus: FilingAnalysisStatus;
  analysisError: string | null;
};

function analysisLabel(status: FilingAnalysisStatus, error: string | null): string | null {
  if (status === "loading") return "Analyzing…";
  if (status === "queued") return "Queued for analysis…";
  if (status === "complete") return "Analyzed";
  if (status === "error") return error ?? "Analysis failed";
  return null;
}

function skeletonConfig(status: FilingAnalysisStatus) {
  switch (status) {
    case "loading":
      return {
        name: BONE_NAMES.filingRowAnalyzing,
        loading: true,
        animate: "shimmer" as const,
        color: undefined,
      };
    case "queued":
      return {
        name: BONE_NAMES.filingRowQueued,
        loading: true,
        animate: "pulse" as const,
        color: "rgba(0, 0, 0, 0.04)",
      };
    default:
      return null;
  }
}

export function FilingTableRow({
  cik,
  filing,
  analysisStatus,
  analysisError,
}: FilingTableRowProps) {
  const label = analysisLabel(analysisStatus, analysisError);
  const skeleton = skeletonConfig(analysisStatus);
  const rowContent = (
    <FilingRowContent cik={cik} filing={filing} analysisLabel={label} />
  );

  return (
    <tr className="hover:bg-zinc-50/80">
      <td colSpan={5} className="p-0">
        {skeleton ? (
          <Skeleton
            name={skeleton.name}
            loading={skeleton.loading}
            transition
            animate={skeleton.animate}
            color={skeleton.color}
            className="w-full"
            fixture={
              <FilingRowContent
                cik="0000789019"
                filing={FILING_ROW_FIXTURE}
                analysisLabel={analysisStatus === "queued" ? "Queued for analysis…" : "Analyzing…"}
              />
            }
            fallback={
              <div className="px-6 py-4">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
              </div>
            }
          >
            {rowContent}
          </Skeleton>
        ) : (
          rowContent
        )}
      </td>
    </tr>
  );
}
