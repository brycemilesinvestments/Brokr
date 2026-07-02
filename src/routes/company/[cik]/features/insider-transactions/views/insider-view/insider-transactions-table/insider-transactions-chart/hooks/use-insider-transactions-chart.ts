import { useCallback, useMemo, useState } from "react";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { buildActivitySeries } from "../lib/build-activity-series";
import {
  buildActivityBarData,
  buildHoldingsChartConfig,
  buildHoldingsLineData,
} from "../lib/build-recharts-data";
import { buildHoldingsSeries } from "../lib/build-holdings-series";
import { filterByTimeRange, latestTransactionTime } from "../lib/filter-by-time-range";
import type { ChartMode, TimeRange } from "../types";
import { primarySecurityName } from "../utils/primary-security-name";
import { uniqueOwners } from "../utils/unique-owners";

export function useInsiderTransactionsChart(transactions: InsiderTransaction[]) {
  const owners = useMemo(() => uniqueOwners(transactions), [transactions]);
  const [chartMode, setChartMode] = useState<ChartMode>("activity");
  const [timeRange, setTimeRange] = useState<TimeRange>("3M");
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(() => new Set(owners));

  const effectiveSelectedOwners = useMemo(() => {
    const active = owners.filter((owner) => selectedOwners.has(owner));
    return active.length > 0 ? active : owners;
  }, [owners, selectedOwners]);

  const ownerFilteredTransactions = useMemo(
    () => transactions.filter((transaction) => effectiveSelectedOwners.includes(transaction.reportingOwner)),
    [transactions, effectiveSelectedOwners],
  );

  const latestTime = useMemo(
    () => latestTransactionTime(ownerFilteredTransactions),
    [ownerFilteredTransactions],
  );

  const rangedTransactions = useMemo(
    () => filterByTimeRange(ownerFilteredTransactions, timeRange, latestTime),
    [ownerFilteredTransactions, timeRange, latestTime],
  );

  const holdingsSecurity = useMemo(
    () => primarySecurityName(rangedTransactions),
    [rangedTransactions],
  );

  const series = useMemo(() => {
    if (chartMode === "activity") {
      return buildActivitySeries(rangedTransactions, timeRange);
    }
    return buildHoldingsSeries(
      rangedTransactions,
      effectiveSelectedOwners.slice(0, 8),
      holdingsSecurity,
    );
  }, [chartMode, rangedTransactions, timeRange, effectiveSelectedOwners, holdingsSecurity]);

  const activityData = useMemo(
    () => (chartMode === "activity" ? buildActivityBarData(series) : []),
    [chartMode, series],
  );

  const holdings = useMemo(
    () => (chartMode === "holdings" ? buildHoldingsLineData(series) : { data: [], series: [] }),
    [chartMode, series],
  );

  const holdingsConfig = useMemo(
    () => buildHoldingsChartConfig(holdings.series),
    [holdings.series],
  );

  const totalBuys = useMemo(
    () =>
      rangedTransactions
        .filter((transaction) => transaction.acquiredOrDisposed === "A")
        .reduce((sum, transaction) => sum + (transaction.sharesTransacted ?? 0), 0),
    [rangedTransactions],
  );

  const totalSells = useMemo(
    () =>
      rangedTransactions
        .filter((transaction) => transaction.acquiredOrDisposed === "D")
        .reduce((sum, transaction) => sum + (transaction.sharesTransacted ?? 0), 0),
    [rangedTransactions],
  );

  const toggleOwner = useCallback((owner: string) => {
    setSelectedOwners((current) => {
      const next = new Set(current);
      if (next.has(owner)) {
        next.delete(owner);
      } else {
        next.add(owner);
      }
      return next;
    });
  }, []);

  const hasChartData =
    chartMode === "activity"
      ? activityData.some((row) => row.buys > 0 || row.sells > 0)
      : holdings.data.length > 0;

  return {
    owners,
    chartMode,
    setChartMode,
    timeRange,
    setTimeRange,
    selectedOwners,
    effectiveSelectedOwners,
    holdingsSecurity,
    activityData,
    holdingsData: holdings.data,
    holdingsSeries: holdings.series,
    holdingsConfig,
    totalBuys,
    totalSells,
    toggleOwner,
    hasChartData,
  };
}
