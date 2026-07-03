"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChartTimeRangeSwitch,
  filterDatedRowsByTimeRange,
  type ChartTimeRange,
} from "@/routes/company/[cik]/components/chart-time-range-switch";
import { CHART_VIEWPORT_HEIGHT } from "@/routes/company/[cik]/lib/chart-viewport";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import { FRED_OBSERVATION_START } from "@/lib/fred";
import { FredSeriesChart } from "./components/fred-series-chart";
import { FredSeriesSidebar } from "./components/fred-series-sidebar";
import { buildFredChartRows } from "./lib/build-fred-chart-rows";
import type { FredSeriesCatalogResponse, FredSeriesObservationsResponse } from "./types";

type FredPanelProps = {
  enabled: boolean;
  selectedSeriesId?: string | null;
  onSelectedSeriesIdChange?: (seriesId: string | null) => void;
};

export function FredPanel({
  enabled,
  selectedSeriesId: selectedSeriesIdProp = null,
  onSelectedSeriesIdChange,
}: FredPanelProps) {
  const [internalSeriesId, setInternalSeriesId] = useState<string | null>(selectedSeriesIdProp);
  const [timeRange, setTimeRange] = useState<ChartTimeRange>("5Y");
  const selectedSeriesId = selectedSeriesIdProp ?? internalSeriesId;

  const setSelectedSeriesId = useCallback(
    (seriesId: string | null) => {
      setInternalSeriesId(seriesId);
      onSelectedSeriesIdChange?.(seriesId);
    },
    [onSelectedSeriesIdChange],
  );

  useEffect(() => {
    if (selectedSeriesIdProp) {
      setInternalSeriesId(selectedSeriesIdProp);
    }
  }, [selectedSeriesIdProp]);

  const {
    data: catalog,
    loading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCompanyApi<FredSeriesCatalogResponse>(enabled ? "/api/fred/series" : null, enabled);

  const observationsUrl = selectedSeriesId
    ? `/api/fred/series/${encodeURIComponent(selectedSeriesId)}?from=${FRED_OBSERVATION_START}`
    : null;

  const {
    data: observations,
    loading: observationsLoading,
    error: observationsError,
    refetch: refetchObservations,
  } = useCompanyApi<FredSeriesObservationsResponse>(observationsUrl, enabled && Boolean(selectedSeriesId));

  useEffect(() => {
    if (!enabled || !catalog?.series.length || selectedSeriesId) return;
    setSelectedSeriesId(catalog.series[0]?.series_id ?? null);
  }, [catalog?.series, enabled, selectedSeriesId, setSelectedSeriesId]);

  const allChartData = useMemo(
    () => buildFredChartRows(observations?.observations ?? []),
    [observations?.observations],
  );

  const chartData = useMemo(
    () => filterDatedRowsByTimeRange(allChartData, timeRange),
    [allChartData, timeRange],
  );

  if (!enabled) {
    return null;
  }

  if (catalogLoading && !catalog) {
    return (
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-12 text-center text-sm text-zinc-500">Loading FRED analytics…</div>
      </section>
    );
  }

  if (catalogError) {
    return (
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-8">
          <p className="text-sm text-red-700">{catalogError}</p>
          <Button variant="outline" className="mt-3" onClick={() => void refetchCatalog()}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (!catalog?.series.length) {
    return (
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-12 text-center text-sm text-zinc-500">
          No FRED series in the database yet. Refresh macro data from the timeline admin panel.
        </div>
      </section>
    );
  }

  const activeSeries =
    observations?.series ??
    catalog.series.find((item) => item.series_id === selectedSeriesId) ??
    null;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">FRED macro analytics</h2>
        <p className="mt-1 text-sm text-zinc-500">
          U.S. economic time series from the Federal Reserve Economic Data (FRED) database.
        </p>
      </div>

      <div className="flex min-h-0" style={{ height: CHART_VIEWPORT_HEIGHT }}>
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-zinc-100">
          <FredSeriesSidebar
            series={catalog.series}
            selectedSeriesId={selectedSeriesId}
            onSelectSeries={setSelectedSeriesId}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeSeries ? (
            <>
              <div className="shrink-0 border-b border-zinc-100 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-800">
                    {activeSeries.series_id}
                  </span>
                  {activeSeries.frequency ? (
                    <span className="text-xs text-zinc-500">{activeSeries.frequency}</span>
                  ) : null}
                </div>
                <h3 className="mt-1 text-sm font-medium text-zinc-900">{activeSeries.name}</h3>
                {activeSeries.description ? (
                  <p className="mt-1 text-sm text-zinc-500">{activeSeries.description}</p>
                ) : null}
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden px-2 pb-1 pl-2 pt-1.5">
                {observationsLoading && !observations ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Loading time series…
                  </div>
                ) : observationsError ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800">
                      <p>{observationsError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => void refetchObservations()}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FredSeriesChart series={activeSeries} chartData={chartData} />
                )}
              </div>

              <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
                <ChartTimeRangeSwitch value={timeRange} onChange={setTimeRange} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Select a series to view its time series.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
