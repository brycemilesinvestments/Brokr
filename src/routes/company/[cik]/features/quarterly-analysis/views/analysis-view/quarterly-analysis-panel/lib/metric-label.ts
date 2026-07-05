import { humanizeConcept } from "@/routes/company/[cik]/features/financial-trends/utils/humanize-concept";

const SHORT_LABELS: Record<string, string> = {
  RevenueFromContractWithCustomerExcludingAssessedTax: "Revenue",
  NetIncomeLoss: "Net income",
  GrossProfit: "Gross profit",
  free_cash_flow: "Free cash flow",
  fcf_margin: "FCF margin",
  capex_intensity: "Capex intensity",
  share_count_trend: "Share count",
  pe: "P / E",
  ev_ebitda: "EV / EBITDA",
  p_fcf: "P / FCF",
  ev_sales: "EV / Sales",
  gross_margin: "Gross margin",
  operating_margin: "Operating margin",
  net_margin: "Net margin",
};

export function metricLabel(metric: string): string {
  if (SHORT_LABELS[metric]) return SHORT_LABELS[metric];
  if (metric.startsWith("end_market:") || metric.startsWith("geography:")) {
    return metric.split(":").slice(1).join(":");
  }
  return metric.includes("_") ? metric.replace(/_/g, " ") : humanizeConcept(metric);
}
