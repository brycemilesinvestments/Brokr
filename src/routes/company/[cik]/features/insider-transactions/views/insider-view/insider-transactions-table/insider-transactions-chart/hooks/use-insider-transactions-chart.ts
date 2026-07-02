import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import { buildActivitySeries } from "../lib/build-activity-series";
import { buildChartGeometry } from "../lib/build-chart-geometry";
import { buildHoldingsSeries } from "../lib/build-holdings-series";
import { filterByTimeRange, latestTransactionTime } from "../lib/filter-by-time-range";
import { buildHoverState } from "../lib/hover-state";
import type { ChartMode, HoverState, SnapPoint, TimeRange } from "../types";
import { primarySecurityName } from "../utils/primary-security-name";
import { findLineValueAtSnap, findNearestSnap, getSvgX } from "../utils/svg-coords";
import { uniqueOwners } from "../utils/unique-owners";

export function useInsiderTransactionsChart(transactions: InsiderTransaction[]) {
  const owners = useMemo(() => uniqueOwners(transactions), [transactions]);
  const [chartMode, setChartMode] = useState<ChartMode>("activity");
  const [timeRange, setTimeRange] = useState<TimeRange>("3M");
  const [hover, setHover] = useState<HoverState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(() => new Set(owners));

  const effectiveSelectedOwners = useMemo(() => {
    const active = owners.filter((owner) => selectedOwners.has(owner));
    return active.length > 0 ? active : owners;
  }, [owners, selectedOwners]);

  const ownerFilteredTransactions = useMemo(
    () => transactions.filter((t) => effectiveSelectedOwners.includes(t.reportingOwner)),
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

  const geometry = useMemo(() => buildChartGeometry(series, timeRange), [series, timeRange]);
  const { lines, yTicks, xLabels, yMin, yMax, snapPoints } = geometry;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const handleChartMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const svg = svgRef.current;
      if (!svg || snapPoints.length === 0) return;

      const svgX = getSvgX(svg, event.clientX);
      if (svgX < PADDING.left || svgX > CHART_WIDTH - PADDING.right) {
        setHover(null);
        return;
      }

      const snap = findNearestSnap(snapPoints, svgX);
      if (!snap) return;

      setHover(buildHoverState(geometry, snap));
    },
    [geometry, snapPoints],
  );

  const handleChartMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  const activeDots = useMemo(() => {
    if (!hover) return [];

    const snap: SnapPoint = { time: hover.time, date: hover.date, x: hover.x };

    return lines.flatMap((line) => {
      const match = findLineValueAtSnap(line, snap);
      if (!match) return [];
      return [{ lineId: line.id, color: line.color, x: hover.x, y: match.y }];
    });
  }, [hover, lines]);

  useEffect(() => {
    setHover(null);
  }, [chartMode, timeRange, series]);

  const totalBuys = useMemo(
    () =>
      rangedTransactions
        .filter((t) => t.acquiredOrDisposed === "A")
        .reduce((sum, t) => sum + (t.sharesTransacted ?? 0), 0),
    [rangedTransactions],
  );

  const totalSells = useMemo(
    () =>
      rangedTransactions
        .filter((t) => t.acquiredOrDisposed === "D")
        .reduce((sum, t) => sum + (t.sharesTransacted ?? 0), 0),
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

  const hasChartData = lines.some((line) => line.chartPoints.length > 0);

  return {
    owners,
    chartMode,
    setChartMode,
    timeRange,
    setTimeRange,
    hover,
    svgRef,
    selectedOwners,
    effectiveSelectedOwners,
    holdingsSecurity,
    lines,
    yTicks,
    xLabels,
    yMin,
    yMax,
    plotWidth,
    plotHeight,
    handleChartMouseMove,
    handleChartMouseLeave,
    activeDots,
    totalBuys,
    totalSells,
    toggleOwner,
    hasChartData,
  };
}
