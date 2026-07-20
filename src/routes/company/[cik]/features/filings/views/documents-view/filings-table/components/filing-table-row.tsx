"use client";

import { useMemo } from "react";
import { Skeleton } from "boneyard-js/react";
import { BONE_NAMES } from "@/components/bones/skeleton-names";
import { isForm345Filing } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/lib/is-form345-filing";
import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";
import { FILING_ROW_FIXTURE } from "./filing-row-fixture";
import { FilingRowContent } from "./filing-row-content";

type FilingTableRowProps = {
  cik: string;
  filing: Filing;
  analysisStatus: FilingWorkStatus;
  analysisError: string | null;
  analysisLabelFormType?: string;
};

function analysisLabel(
  status: FilingWorkStatus,
  error: string | null,
  formType?: string,
): string | null {
  const form345 = formType ? isForm345Filing(formType) : false;
  if (form345 && status === "idle") return "Open Insider tab";
  if (status === "storing") return form345 ? "Ingesting…" : "Downloading…";
  if (status === "analyzing") return "Analyzing…";
  if (status === "queued-store") return form345 ? "Queued for ingest…" : "Queued for download…";
  if (status === "queued-analyze") return "Queued for analysis…";
  if (status === "complete") return form345 ? "Ingested" : "Analyzed";
  if (status === "unavailable") return "Document unavailable on SEC";
  if (status === "error") return error ?? "Processing failed";
  return null;
}

function skeletonConfig(status: FilingWorkStatus) {
  switch (status) {
    case "storing":
    case "analyzing":
      return {
        name: BONE_NAMES.filingRowAnalyzing,
        loading: true,
        animate: "shimmer" as const,
        color: undefined,
      };
    case "queued-store":
    case "queued-analyze":
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
  analysisLabelFormType,
}: FilingTableRowProps) {
  const label = analysisLabel(analysisStatus, analysisError, analysisLabelFormType ?? filing.type);
  const skeleton = skeletonConfig(analysisStatus);
  const skeletonFixture = useMemo(
    () => (
      <FilingRowContent
        cik="0000789019"
        filing={FILING_ROW_FIXTURE}
        analysisLabel={
          analysisStatus === "queued-store"
            ? "Queued for download…"
            : analysisStatus === "queued-analyze"
              ? "Queued for analysis…"
              : "Analyzing…"
        }
      />
    ),
    [analysisStatus],
  );
  const rowContent = (
    <FilingRowContent
      cik={cik}
      filing={filing}
      analysisLabel={label}
      analysisLabelTone={
        analysisStatus === "error"
          ? "error"
          : analysisStatus === "unavailable"
            ? "muted"
            : "default"
      }
    />
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
            fixture={skeletonFixture}
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
