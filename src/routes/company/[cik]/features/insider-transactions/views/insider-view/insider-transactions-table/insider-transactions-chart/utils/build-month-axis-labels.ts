import { formatMonthAxisLabel, formatMonthLabel } from "./format-month-label";

/** Minimum horizontal gap between month labels in SVG units (matches other charts' minTickGap). */
export const MIN_MONTH_AXIS_LABEL_GAP = 44;

function firstIndexPerYear(monthKeys: string[]): number[] {
  const indices: number[] = [];
  let lastYear: number | undefined;

  for (let index = 0; index < monthKeys.length; index += 1) {
    const year = Number(monthKeys[index].split("-")[0]);
    if (year !== lastYear) {
      indices.push(index);
      lastYear = year;
    }
  }

  return indices;
}

function selectEvenlySpacedIndices(indices: number[], maxLabels: number): Set<number> {
  if (indices.length <= maxLabels) {
    return new Set(indices);
  }

  const selected = new Set<number>([indices[0], indices[indices.length - 1]]);
  const interiorSlots = maxLabels - 2;

  for (let slot = 1; slot <= interiorSlots; slot += 1) {
    const position = Math.round((slot * (indices.length - 1)) / (interiorSlots + 1));
    selected.add(indices[position]);
  }

  return selected;
}

function selectMonthLabelIndices(count: number, maxLabels: number): Set<number> {
  return selectEvenlySpacedIndices(
    Array.from({ length: count }, (_, index) => index),
    maxLabels,
  );
}

function selectYearFirstLabelIndices(monthKeys: string[], maxLabels: number): Set<number> {
  return selectEvenlySpacedIndices(firstIndexPerYear(monthKeys), maxLabels);
}

function formatYearAxisLabel(monthKey: string): string {
  const year = Number(monthKey.split("-")[0]);
  return `'${String(year).slice(-2)}`;
}

export function buildMonthAxisLabels(
  monthKeys: string[],
  plotWidth: number,
): Array<string | null> {
  const count = monthKeys.length;
  if (count === 0) return [];

  const maxLabels = Math.max(2, Math.floor(plotWidth / MIN_MONTH_AXIS_LABEL_GAP));

  if (count <= maxLabels) {
    return monthKeys.map((monthKey, index) =>
      formatMonthAxisLabel(monthKey, index > 0 ? monthKeys[index - 1] : undefined),
    );
  }

  const yearCount = new Set(monthKeys.map((monthKey) => monthKey.split("-")[0])).size;

  if (yearCount > 1) {
    const showIndices = selectYearFirstLabelIndices(monthKeys, maxLabels);
    return monthKeys.map((monthKey, index) =>
      showIndices.has(index) ? formatYearAxisLabel(monthKey) : null,
    );
  }

  const showIndices = selectMonthLabelIndices(count, maxLabels);
  const skipRatio = count / showIndices.size;

  return monthKeys.map((monthKey, index) => {
    if (!showIndices.has(index)) return null;

    const [year, month] = monthKey.split("-").map(Number);
    const previousYear =
      index > 0 ? Number(monthKeys[index - 1].split("-")[0]) : undefined;
    const isYearBoundary =
      index === 0 || index === count - 1 || month === 1 || year !== previousYear;

    if (skipRatio >= 2) {
      return formatMonthLabel(monthKey, isYearBoundary);
    }

    return formatMonthAxisLabel(monthKey, index > 0 ? monthKeys[index - 1] : undefined);
  });
}
