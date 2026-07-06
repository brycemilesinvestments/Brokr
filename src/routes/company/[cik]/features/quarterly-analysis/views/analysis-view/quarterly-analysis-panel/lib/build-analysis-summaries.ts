import type { ChartBundle } from "@/lib/analysis";
import type { CompanyAnalysisOutput } from "@/lib/orchestrate";
import {
  formatDeltaPercent,
  formatMetricValue,
} from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";
import { latestQuarterlyPoint } from "./chart-helpers";

export type PillarStrength = "strong" | "moderate" | "rich" | "weak";

export type AnalysisPillar = {
  key: "growth" | "profitability" | "cash" | "valuation";
  label: string;
  strength: PillarStrength;
  strengthLabel: string;
  headline: string;
  detail: string;
};

export type AnalysisVerdict = {
  headline: string;
  description: string;
  pillars: AnalysisPillar[];
};

const STRENGTH_LABELS: Record<PillarStrength, string> = {
  strong: "Strong",
  moderate: "Moderate",
  rich: "Rich",
  weak: "Weak",
};

function strengthClass(strength: PillarStrength): string {
  if (strength === "strong") return "bg-emerald-50 text-emerald-700";
  if (strength === "rich" || strength === "moderate") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export { strengthClass };

function classifyGrowth(yoy: number | undefined): PillarStrength {
  if (yoy === undefined) return "moderate";
  if (yoy >= 0.2) return "strong";
  if (yoy >= 0) return "moderate";
  return "weak";
}

function classifyMargin(margin: number | undefined): PillarStrength {
  if (margin === undefined) return "moderate";
  if (margin >= 0.15) return "strong";
  if (margin >= 0.05) return "moderate";
  return "weak";
}

function classifyCash(fcf: number | undefined): PillarStrength {
  if (fcf === undefined) return "moderate";
  if (fcf > 0) return "strong";
  if (fcf === 0) return "moderate";
  return "weak";
}

function classifyValuation(pe: number | undefined): PillarStrength {
  if (pe === undefined) return "moderate";
  if (pe >= 35) return "rich";
  if (pe >= 15) return "moderate";
  return "strong";
}

export function buildAnalysisVerdict(
  data: CompanyAnalysisOutput,
  charts: ChartBundle,
): AnalysisVerdict {
  const revenue = latestQuarterlyPoint(
    charts,
    "RevenueFromContractWithCustomerExcludingAssessedTax",
  );
  const grossMargin = latestQuarterlyPoint(charts, "gross_margin");
  const operatingMargin = latestQuarterlyPoint(charts, "operating_margin");
  const netMargin = latestQuarterlyPoint(charts, "net_margin");
  const fcf = latestQuarterlyPoint(charts, "free_cash_flow");
  const pe = latestQuarterlyPoint(charts, "pe");
  const latestEv = data.valuation?.enterpriseValue.points.at(-1);

  const growthStrength = classifyGrowth(revenue?.delta_yoy);
  const profitabilityStrength = classifyMargin(netMargin?.y);
  const cashStrength = classifyCash(fcf?.y);
  const valuationStrength = classifyValuation(pe?.y);

  const pillars: AnalysisPillar[] = [
    {
      key: "growth",
      label: "Growth",
      strength: growthStrength,
      strengthLabel: STRENGTH_LABELS[growthStrength],
      headline: revenue
        ? `Rev ${formatDeltaPercent(revenue.delta_yoy)} YoY`
        : "Revenue trend unavailable",
      detail: revenue
        ? `Latest ${formatMetricValue("RevenueFromContractWithCustomerExcludingAssessedTax", revenue.y)} on ${revenue.x}.`
        : "No quarterly revenue series in filing history.",
    },
    {
      key: "profitability",
      label: "Profitability",
      strength: profitabilityStrength,
      strengthLabel: STRENGTH_LABELS[profitabilityStrength],
      headline: netMargin ? `Net margin ${(netMargin.y * 100).toFixed(1)}%` : "Margin data limited",
      detail:
        grossMargin && operatingMargin
          ? `Gross ${(grossMargin.y * 100).toFixed(0)}% · operating ${(operatingMargin.y * 100).toFixed(0)}%.`
          : "Margin stack not fully reported.",
    },
    {
      key: "cash",
      label: "Cash",
      strength: cashStrength,
      strengthLabel: STRENGTH_LABELS[cashStrength],
      headline: fcf ? `FCF ${formatMetricValue("free_cash_flow", fcf.y)}` : "FCF unavailable",
      detail: fcf
        ? fcf.y >= 0
          ? "Generating free cash flow in the latest quarter."
          : "Latest quarter still cash-consuming."
        : "Extended cash flow metrics missing from SEC data.",
    },
    {
      key: "valuation",
      label: "Valuation",
      strength: valuationStrength,
      strengthLabel: STRENGTH_LABELS[valuationStrength],
      headline: pe ? `P/E ${pe.y.toFixed(1)}x` : "Valuation N/A",
      detail: latestEv
        ? `Priced for continued performance — EV ${formatMetricValue("Assets", latestEv.enterpriseValue)}.`
        : data.valuation
          ? "Market multiples available without EV snapshot."
          : "Add a ticker to enable valuation multiples.",
    },
  ];

  const strongCount = pillars.filter((pillar) => pillar.strength === "strong").length;
  const richValuation = valuationStrength === "rich";
  const weakGrowth = growthStrength === "weak";

  let headline = "Fundamentals are mixed — review the series grid below.";
  if (strongCount >= 3 && !richValuation) {
    headline = "Strong operating profile with reasonable valuation.";
  } else if (strongCount >= 3 && richValuation) {
    headline = "Growing fast and cash-generative — and priced for it.";
  } else if (weakGrowth && richValuation) {
    headline = "Growth is slowing while the multiple stays elevated.";
  } else if (cashStrength === "weak") {
    headline = "Cash generation is the main watch item.";
  }

  const descriptionParts = [
    revenue?.delta_yoy !== undefined && revenue.delta_yoy > 0
      ? "Revenue is compounding"
      : "Revenue trends need monitoring",
    fcf && fcf.y > 0 ? "with positive free cash flow" : "with uneven cash conversion",
    richValuation
      ? "; the multiple leaves little room for a miss."
      : valuationStrength === "strong"
        ? "; valuation looks less demanding on current fundamentals."
        : ".",
  ];

  return {
    headline,
    description: descriptionParts.join(" "),
    pillars,
  };
}
