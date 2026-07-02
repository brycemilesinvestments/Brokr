"use client";

import { Button } from "@/components/ui/button";
import { FilingsTable } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table";
import { useForm8kSync } from "@/routes/company/[cik]/hooks/use-form-8k-sync";
import { useForm10kSync } from "@/routes/company/[cik]/hooks/use-form-10k-sync";
import type { DocumentsViewProps } from "@/routes/company/[cik]/types";

type SyncPayload = {
  label: string;
  loading: boolean;
  error: string | null;
  processedCount: number;
  errorCount: number;
  newlyStored: number;
  errors: Array<{ accessionNumber: string; message: string }>;
  onRetry: () => void;
};

function SyncStatusBanner({ label, loading, error, processedCount, errorCount, newlyStored, errors, onRetry }: SyncPayload) {
  if (loading) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        {label}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p>{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry sync
        </Button>
      </div>
    );
  }

  if (processedCount === 0 && errorCount === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
      <p>
        Synced <span className="font-medium text-zinc-900">{processedCount}</span> {label} filing
        {processedCount === 1 ? "" : "s"}
        {newlyStored > 0 ? (
          <>
            {" "}
            (<span className="font-medium text-zinc-900">{newlyStored}</span> newly stored)
          </>
        ) : null}
        .
        {errorCount > 0 ? (
          <span className="text-amber-800">
            {" "}
            {errorCount} filing{errorCount === 1 ? "" : "s"} could not be processed.
          </span>
        ) : null}
      </p>
      {errors.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-800">
          {errors.map((entry) => (
            <li key={entry.accessionNumber}>
              {entry.accessionNumber}: {entry.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DocumentsView({ cik, filings, totalShown, enabled }: DocumentsViewProps) {
  const sync8k = useForm8kSync(cik, enabled);
  const sync10k = useForm10kSync(cik, enabled);

  return (
    <div className="space-y-4">
      {enabled ? (
        <div className="space-y-3">
          <SyncStatusBanner
            label="Storing 8-K documents, building search embeddings, and classifying event types…"
            loading={sync8k.loading}
            error={sync8k.error}
            processedCount={sync8k.data?.processedCount ?? 0}
            errorCount={sync8k.data?.errorCount ?? 0}
            newlyStored={sync8k.data?.processed.filter((item) => !item.skippedStore).length ?? 0}
            errors={sync8k.data?.errors ?? []}
            onRetry={() => void sync8k.refetch()}
          />
          <SyncStatusBanner
            label="Storing 10-K documents, extracting iXBRL sections, and running annual analysis…"
            loading={sync10k.loading}
            error={sync10k.error}
            processedCount={sync10k.data?.processedCount ?? 0}
            errorCount={sync10k.data?.errorCount ?? 0}
            newlyStored={sync10k.data?.processed.filter((item) => !item.skippedStore).length ?? 0}
            errors={sync10k.data?.errors ?? []}
            onRetry={() => void sync10k.refetch()}
          />
        </div>
      ) : null}
      <FilingsTable cik={cik} filings={filings} totalShown={totalShown} />
    </div>
  );
}
