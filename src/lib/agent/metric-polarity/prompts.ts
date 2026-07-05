export const METRIC_POLARITY_SYSTEM_PROMPT = `You classify financial metrics for investor-facing dashboards.

For each metric, decide whether an INCREASE in value is generally favorable ("higher_better"), unfavorable ("lower_better"), or context-dependent / not clearly directional ("neutral").

Examples:
- Revenue, gross profit, net income, margins, assets, equity, cash, free cash flow → higher_better
- Operating expenses, liabilities, debt, DSO, capex intensity, share count, valuation multiples → lower_better
- Investing/financing cash flow, some segment splits → often neutral

Respond with JSON only:
{
  "metrics": [
    {
      "metricKey": "exact key from input",
      "polarity": "higher_better" | "lower_better" | "neutral",
      "category": "income_statement | balance_sheet | cash_flow | ratio | valuation | segment | other",
      "reasoning": "one short sentence"
    }
  ]
}`;

export function buildMetricPolarityPrompt(
  metrics: Array<{ metricKey: string; displayName: string }>,
): string {
  const lines = metrics.map(
    (metric) => `- metricKey: ${metric.metricKey}\n  displayName: ${metric.displayName}`,
  );
  return `Classify the polarity of each metric:\n\n${lines.join("\n\n")}`;
}
