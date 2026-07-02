"use client";

import { Button } from "@/components/ui/button";
import { FilingsTable } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table";
import { useForm8kSync } from "@/routes/company/[cik]/hooks/use-form-8k-sync";
import type { DocumentsViewProps } from "@/routes/company/[cik]/types";

function SyncStatusBanner({
  loading,
  error,
  data,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  data: ReturnType<typeof useForm8kSync>["data"];
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Storing 8-K documents, building search embeddings, and classifying event types…
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

  if (!data) return null;

  const newlyStored = data.processed.filter((item) => !item.skippedStore).length;
  const analyzed = data.processed.length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
      <p>
        Synced <span className="font-medium text-zinc-900">{analyzed}</span> 8-K filing
        {analyzed === 1 ? "" : "s"}
        {newlyStored > 0 ? (
          <>
            {" "}
            (<span className="font-medium text-zinc-900">{newlyStored}</span> newly stored)
          </>
        ) : null}
        .
        {data.errorCount > 0 ? (
          <span className="text-amber-800">
            {" "}
            {data.errorCount} filing{data.errorCount === 1 ? "" : "s"} could not be processed.
          </span>
        ) : null}
      </p>
      {data.errors.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-800">
          {data.errors.map((entry) => (
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
  const { data, loading, error, refetch } = useForm8kSync(cik, enabled);

  return (
    <div className="space-y-4">
      {enabled ? (
        <SyncStatusBanner
          loading={loading}
          error={error}
          data={data}
          onRetry={() => void refetch()}
        />
      ) : null}
      <FilingsTable cik={cik} filings={filings} totalShown={totalShown} />
    </div>
  );
}
