"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChartTimeRangeSwitch,
  filterDatedRowsByTimeRange,
  type ChartTimeRange,
} from "@/routes/company/[cik]/components/chart-time-range-switch";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import type { FredCategory } from "@/lib/fred/constants";
import { FRED_OBSERVATION_START } from "@/lib/fred";
import { CompanyContentHeader } from "@/routes/company/[cik]/components/company-content-header/company-content-header";
import { FredSeriesChart } from "./components/fred-series-chart";
import { FredSeriesDetailHeader } from "./components/fred-series-detail-header";
import { FredSeriesSidebar } from "./components/fred-series-sidebar";
import {
  FRED_ANALYTICS_CATEGORY_STYLES,
  FRED_ANALYTICS_FALLBACK_STYLE,
  FRED_ANALYTICS_TIME_RANGE_OPTIONS,
} from "./constants";
import { buildFredChartRows } from "./lib/build-fred-chart-rows";
import { computeFredRangeStats } from "./lib/compute-fred-range-stats";
import type { FredSeriesCatalogResponse, FredSeriesObservationsResponse } from "./types";

type FredPanelProps = {
  enabled: boolean;
  ticker?: string;
  selectedSeriesId?: string | null;
  onSelectedSeriesIdChange?: (seriesId: string | null) => void;
};

export function FredPanel({
  enabled,
  ticker,
  selectedSeriesId: selectedSeriesIdProp = null,
  onSelectedSeriesIdChange,
}: FredPanelProps) {
  const [internalSeriesId, setInternalSeriesId] = useState<string | null>(selectedSeriesIdProp);
  const [timeRange, setTimeRange] = useState<ChartTimeRange>("MAX");
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

  const rangeStats = useMemo(() => computeFredRangeStats(chartData), [chartData]);

  if (!enabled) {
    return null;
  }

  if (catalogLoading && !catalog) {
    return (
      <section className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <CompanyContentHeader ticker={ticker} title="FRED macro analytics" />
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Loading FRED analytics…
        </div>
      </section>
    );
  }

  if (catalogError) {
    return (
      <section className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <CompanyContentHeader ticker={ticker} title="FRED macro analytics" />
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
      <section className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <CompanyContentHeader ticker={ticker} title="FRED macro analytics" />
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-zinc-500">
          No FRED series in the database yet. Refresh macro data from the timeline admin panel.
        </div>
      </section>
    );
  }

  const activeSeries =
    observations?.series ??
    catalog.series.find((item) => item.series_id === selectedSeriesId) ??
    null;

  const categoryStyle = activeSeries
    ? (FRED_ANALYTICS_CATEGORY_STYLES[activeSeries.category as FredCategory] ??
      FRED_ANALYTICS_FALLBACK_STYLE)
    : FRED_ANALYTICS_FALLBACK_STYLE;

  return (
    <section className="relative flex min-h-0 flex-1 flex-col bg-zinc-50">
      <CompanyContentHeader
        ticker={ticker}
        title="FRED macro analytics"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path d="M7 3v4l2.5 1.5" />
              <circle cx="7" cy="7" r="5.2" />
            </svg>
            Compare
          </span>
        }
      />

      <div className="flex min-h-0 flex-1">
        <FredSeriesSidebar
          series={catalog.series}
          selectedSeriesId={selectedSeriesId}
          onSelectSeries={setSelectedSeriesId}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {activeSeries && rangeStats ? (
            <>
              <FredSeriesDetailHeader series={activeSeries} stats={rangeStats} />

              <div className="relative min-h-0 flex-1 overflow-hidden px-5 pb-1.5 pt-3.5">
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
                  <FredSeriesChart
                    series={activeSeries}
                    chartData={chartData}
                    lineColor={categoryStyle.color}
                  />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2.5 border-t border-zinc-100 px-6 py-3">
                <ChartTimeRangeSwitch
                  value={timeRange}
                  onChange={setTimeRange}
                  options={[...FRED_ANALYTICS_TIME_RANGE_OPTIONS]}
                  variant="segmented"
                />
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-zinc-300">
                  <span className="size-1.5 rounded-full bg-zinc-300" aria-hidden />
                  FRED data · Federal Reserve Economic Data
                </span>
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
