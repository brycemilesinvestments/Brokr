"use client";

import { Button } from "@/components/ui/button";
import { FRED_OBSERVATION_START } from "@/lib/fred";
import type { FredIngestResult, FredStatus } from "@/lib/fred/types";
import { formatDisplayDate } from "../utils/format-display-date";

type FredDataPanelProps = {
  status: FredStatus | null;
  ingestResult: FredIngestResult | null;
  loadingStatus: boolean;
  ingesting: boolean;
  error: string | null;
  onRefreshStatus: () => void;
  onRefetchFromFred: () => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FredDataPanel({
  status,
  ingestResult,
  loadingStatus,
  ingesting,
  error,
  onRefreshStatus,
  onRefetchFromFred,
}: FredDataPanelProps) {
  const busy = loadingStatus || ingesting;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-indigo-950">FRED macro data</h3>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
              St. Louis Fed
            </span>
            {status?.fredApiKeyConfigured ? (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                API key configured
              </span>
            ) : (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                CSV fallback
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-indigo-900/80">
            U.S. economic indicators stored in Supabase and shown on this timeline. Refresh pulls
            the latest releases from FRED into the database.
          </p>

          {loadingStatus && !status ? (
            <p className="mt-3 text-sm text-indigo-800">Loading FRED database status…</p>
          ) : status ? (
            <dl className="mt-3 grid gap-3 text-sm text-indigo-950 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                  Series in database
                </dt>
                <dd className="mt-1 font-mono text-base font-semibold">
                  {status.seriesCount}
                  <span className="text-sm font-normal text-indigo-700">
                    {" "}
                    / {status.targetSeriesCount}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                  Observations
                </dt>
                <dd className="mt-1 font-mono text-base font-semibold">
                  {status.observationCount.toLocaleString("en-US")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                  Latest release
                </dt>
                <dd className="mt-1 font-medium">
                  {status.latestObservationDate
                    ? formatDisplayDate(status.latestObservationDate)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                  Last refresh
                </dt>
                <dd className="mt-1 font-medium">{formatTimestamp(status.lastIngestedAt)}</dd>
              </div>
            </dl>
          ) : null}

          {status && !status.schemaReady ? (
            <p className="mt-3 text-sm text-amber-900">
              Database tables are not ready yet. Apply the FRED migration or run{" "}
              <code className="rounded bg-white/70 px-1">npm run setup-fred-schema</code> before
              refreshing.
              {status.schemaError ? ` ${status.schemaError}` : ""}
            </p>
          ) : null}

          {status?.inProgressSeries ? (
            <p className="mt-3 text-sm text-indigo-800">
              In progress: <span className="font-mono font-semibold">{status.inProgressSeries}</span>
            </p>
          ) : null}

          {status?.failedSeries.length ? (
            <p className="mt-3 text-sm text-amber-900">
              {status.failedSeries.length} series failed on the last run. Try refreshing again.
            </p>
          ) : null}

          {ingestResult ? (
            <p className="mt-3 text-sm text-indigo-950">
              Refreshed{" "}
              <span className="font-semibold">{ingestResult.ingestedSeries}</span> of{" "}
              {ingestResult.totalSeries} series via {ingestResult.source.toUpperCase()} into{" "}
              <span className="font-semibold">
                {ingestResult.observationCount.toLocaleString("en-US")}
              </span>{" "}
              observations
              {ingestResult.latestObservationDate
                ? ` through ${formatDisplayDate(ingestResult.latestObservationDate)}`
                : ""}
              .
              {ingestResult.failedSeries.length > 0 ? (
                <span className="text-amber-900">
                  {" "}
                  {ingestResult.failedSeries.length} series failed.
                </span>
              ) : null}
            </p>
          ) : null}

          {ingestResult?.failedSeries.length ? (
            <ul className="mt-2 space-y-1 text-xs text-amber-900">
              {ingestResult.failedSeries.map((entry) => (
                <li key={entry.seriesId}>
                  <span className="font-mono">{entry.seriesId}</span>: {entry.reason}
                </li>
              ))}
            </ul>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}

          <p className="mt-3 text-xs text-indigo-800/80">
            Coverage starts {FRED_OBSERVATION_START}. A full refresh can take a few minutes.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onRefreshStatus()}
          >
            {loadingStatus ? "Checking…" : "Check status"}
          </Button>
          <Button
            size="sm"
            disabled={busy || status?.schemaReady === false}
            onClick={() => void onRefetchFromFred()}
          >
            {ingesting ? "Refreshing from FRED…" : "Refresh from FRED"}
          </Button>
        </div>
      </div>
    </div>
  );
}
