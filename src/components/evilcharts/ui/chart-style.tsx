import {
  CHART_THEMES,
  distributeColors,
  getColorsCount,
  type ChartConfig,
} from "@/components/evilcharts/lib/chart-helpers";

export function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, entry]) => entry.colors);

  if (!colorConfig.length) {
    return null;
  }

  const generateCssVars = (theme: keyof typeof CHART_THEMES) => {
    const lines: string[] = [];
    for (const [key, itemConfig] of colorConfig) {
      const colorsArray = itemConfig.colors?.[theme];
      if (!colorsArray || !Array.isArray(colorsArray) || colorsArray.length === 0) {
        continue;
      }

      const maxCount = getColorsCount(itemConfig);
      const distributedColors = distributeColors(colorsArray, maxCount);

      for (const [index, color] of distributedColors.entries()) {
        lines.push(`  --color-${key}-${index}: ${color};`);
      }
    }
    return lines.join("\n");
  };

  const css = Object.entries(CHART_THEMES)
    .map(
      ([theme, prefix]) =>
        `${prefix} [data-chart=${id}] {\n${generateCssVars(theme as keyof typeof CHART_THEMES)}\n}`,
    )
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
