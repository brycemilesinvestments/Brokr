import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Check = {
  id: string;
  pass: boolean;
  detail: string;
};

const ROOT = resolve(import.meta.dirname, "..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function runChecks(): Check[] {
  const expandedPanel = read(
    "src/routes/company/[cik]/features/quarterly-analysis/views/analysis-view/quarterly-analysis-panel/components/expanded-metric-panel.tsx",
  );
  const metricGrid = read(
    "src/routes/company/[cik]/features/quarterly-analysis/views/analysis-view/quarterly-analysis-panel/components/metric-series-grid.tsx",
  );
  const tradingViewChart = read(
    "src/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/components/metric-tradingview-chart.tsx",
  );

  return [
    {
      id: "frequency-tabs",
      pass: /<Tabs\b/.test(expandedPanel) && /<TabsTrigger/.test(expandedPanel),
      detail: "Frequency control uses shadcn Tabs",
    },
    {
      id: "no-frequency-dropdown",
      pass: !/<select\b/.test(expandedPanel) && !/<label\b/.test(expandedPanel),
      detail: "Frequency dropdown/label removed",
    },
    {
      id: "timeframe-switch",
      pass: /ChartTimeRangeSwitch/.test(expandedPanel) && /variant="segmented"/.test(expandedPanel),
      detail: "ChartTimeRangeSwitch present with segmented variant",
    },
    {
      id: "controls-below-chart",
      pass:
        /rounded-xl border border-zinc-100 bg-white p-2[\s\S]*ChartTimeRangeSwitch/.test(
          expandedPanel,
        ),
      detail: "Switchers render below the chart",
    },
    {
      id: "grey-panel",
      pass: /bg-zinc-50/.test(expandedPanel) && !/bg-emerald|bg-red|bg-green/.test(expandedPanel),
      detail: "Panel uses neutral grey background",
    },
    {
      id: "close-x-button",
      pass: /aria-label="Close expanded metric"/.test(expandedPanel) && !/>Close</.test(expandedPanel),
      detail: "Close control is an X button",
    },
    {
      id: "documents-button",
      pass: /\bDocuments\b/.test(expandedPanel) && /filingHref/.test(expandedPanel),
      detail: "Documents button links to relevant filing",
    },
    {
      id: "value-under-title",
      pass:
        /{metricLabel\(metric\)}[\s\S]*{formatMetricValue\(metric, displayPoint\.value\)}/.test(
          expandedPanel,
        ),
      detail: "Value sits under the title on the left",
    },
    {
      id: "removed-expanded-series-copy",
      pass: !/Expanded series/.test(expandedPanel) && !/Latest/.test(expandedPanel),
      detail: "Removed Expanded series / Latest labels",
    },
    {
      id: "removed-grid-heading",
      pass: !/All series · click to expand/.test(metricGrid),
      detail: "Removed grid heading paragraph",
    },
    {
      id: "tradingview-chart",
      pass: /lightweight-charts/.test(tradingViewChart) && !/EvilAreaChart|recharts/.test(expandedPanel),
      detail: "Expanded chart uses TradingView lightweight-charts",
    },
    {
      id: "no-reveal-animation",
      pass:
        !/REVEAL_DURATION_MS/.test(tradingViewChart) &&
        !/requestAnimationFrame/.test(tradingViewChart),
      detail: "Chart renders immediately without reveal animation",
    },
    {
      id: "filings-props-threaded",
      pass: /filings={filings}/.test(metricGrid) && /filings: Filing\[\]/.test(metricGrid),
      detail: "Filings are passed into ExpandedMetricPanel",
    },
  ];
}

function main(): void {
  const checks = runChecks();
  const failures = checks.filter((check) => !check.pass);

  for (const check of checks) {
    const status = check.pass ? "PASS" : "FAIL";
    console.log(`${status}  ${check.id}: ${check.detail}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed. More work required.`);
    process.exit(1);
  }

  console.log(`\nAll ${checks.length} checks passed. Expanded metric panel work is complete.`);
}

main();
