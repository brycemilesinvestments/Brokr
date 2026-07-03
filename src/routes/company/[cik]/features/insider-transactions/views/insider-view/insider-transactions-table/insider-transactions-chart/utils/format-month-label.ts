export function formatMonthLabel(monthKey: string, showYear?: boolean): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString("en-US", { month: "short" });

  if (showYear) {
    const shortYear = String(year).slice(-2);
    return `${monthName} '${shortYear}`;
  }

  return monthName;
}

export function formatMonthAxisLabel(
  monthKey: string,
  previousMonthKey?: string,
): string {
  const [year] = monthKey.split("-").map(Number);
  const previousYear = previousMonthKey
    ? Number(previousMonthKey.split("-")[0])
    : undefined;

  const showYear = previousYear === undefined || year !== previousYear;
  return formatMonthLabel(monthKey, showYear);
}
