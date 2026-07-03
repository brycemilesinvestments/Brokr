import { useMemo, useState } from "react";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { buildMonthlyVolume } from "../lib/build-monthly-volume";
import { buildNetPositionRows } from "../lib/build-net-position-rows";
import {
  detectVolumeChartExclusions,
  formatExclusionFootnote,
} from "../lib/detect-volume-exclusions";
import {
  buildHoldingsChartConfig,
  buildHoldingsLineData,
} from "../lib/build-recharts-data";
import { buildHoldingsSeries } from "../lib/build-holdings-series";
import { filterByTimeRange, latestTransactionTime } from "../lib/filter-by-time-range";
import type { ChartMode, HoldingsView, TimeRange } from "../types";
import { primarySecurityName } from "../utils/primary-security-name";
import { uniqueOwners } from "../utils/unique-owners";

export function useInsiderTransactionsChart(transactions: InsiderTransaction[]) {
  const owners = useMemo(() => uniqueOwners(transactions), [transactions]);
  const [chartMode, setChartMode] = useState<ChartMode>("activity");
  const [holdingsView, setHoldingsView] = useState<HoldingsView>("net-position");
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");

  const latestTime = useMemo(() => latestTransactionTime(transactions), [transactions]);

  const rangedTransactions = useMemo(
    () => filterByTimeRange(transactions, timeRange, latestTime),
    [transactions, timeRange, latestTime],
  );

  const { chartTransactions, exclusionFootnote } = useMemo(() => {
    const { included, exclusions } = detectVolumeChartExclusions(rangedTransactions);
    return {
      chartTransactions: included,
      exclusionFootnote: formatExclusionFootnote(exclusions),
    };
  }, [rangedTransactions]);

  const monthlyVolume = useMemo(
    () => buildMonthlyVolume(chartTransactions),
    [chartTransactions],
  );

  const netPositionRows = useMemo(
    () => buildNetPositionRows(chartTransactions),
    [chartTransactions],
  );

  const holdingsSecurity = useMemo(
    () => primarySecurityName(rangedTransactions),
    [rangedTransactions],
  );

  const series = useMemo(() => {
    if (chartMode === "holdings" && holdingsView === "timeline") {
      return buildHoldingsSeries(rangedTransactions, owners.slice(0, 8), holdingsSecurity);
    }
    return [];
  }, [chartMode, holdingsView, rangedTransactions, owners, holdingsSecurity]);

  const holdings = useMemo(
    () =>
      chartMode === "holdings" && holdingsView === "timeline"
        ? buildHoldingsLineData(series)
        : { data: [], series: [] },
    [chartMode, holdingsView, series],
  );

  const holdingsConfig = useMemo(
    () => buildHoldingsChartConfig(holdings.series),
    [holdings.series],
  );

  const totalBuys = useMemo(
    () =>
      chartTransactions
        .filter((transaction) => transaction.acquiredOrDisposed === "A")
        .reduce((sum, transaction) => sum + (transaction.sharesTransacted ?? 0), 0),
    [chartTransactions],
  );

  const totalSells = useMemo(
    () =>
      chartTransactions
        .filter((transaction) => transaction.acquiredOrDisposed === "D")
        .reduce((sum, transaction) => sum + (transaction.sharesTransacted ?? 0), 0),
    [chartTransactions],
  );

  const hasChartData =
    chartMode === "activity"
      ? monthlyVolume.some((bucket) => bucket.acquired > 0 || bucket.disposed > 0)
      : holdingsView === "net-position"
        ? netPositionRows.length > 0
        : holdings.data.length > 0;

  return {
    chartMode,
    setChartMode,
    holdingsView,
    setHoldingsView,
    timeRange,
    setTimeRange,
    holdingsSecurity,
    monthlyVolume,
    exclusionFootnote,
    netPositionRows,
    holdingsData: holdings.data,
    holdingsSeries: holdings.series,
    holdingsConfig,
    totalBuys,
    totalSells,
    hasChartData,
  };
}
