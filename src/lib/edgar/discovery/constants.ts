/** Tier-1 concepts worth surfacing beyond the core whitelist. */
export const TIER1_USEFUL_CONCEPTS = [
  "PaymentsToAcquirePropertyPlantAndEquipment",
  "CapitalExpendituresIncurredButNotYetPaid",
  "ShareBasedCompensation",
  "RevenueRemainingPerformanceObligation",
  "AccountsReceivableNetCurrent",
  "InventoryNet",
  "ConcentrationRiskPercentage1",
  "DisaggregationOfRevenueTableTextBlock",
] as const;

/** Concepts whose names imply segment / disaggregated revenue. */
export const SEGMENT_REVENUE_PATTERNS = [
  /Segment/i,
  /DisaggregationOfRevenue/i,
  /RevenueFromExternalCustomer/i,
  /GeographicArea/i,
] as const;

/** DEI and other metadata concepts with no analytic value. */
export const IGNORABLE_DEI_CONCEPTS = new Set([
  "EntityRegistrantName",
  "EntityCentralIndexKey",
  "EntityFilerCategory",
  "EntitySmallBusiness",
  "EntityEmergingGrowthCompany",
  "EntityShellCompany",
  "EntityPublicFloat",
  "EntityCommonStockSharesOutstanding",
  "DocumentType",
  "DocumentPeriodEndDate",
  "DocumentFiscalYearFocus",
  "DocumentFiscalPeriodFocus",
  "DocumentQuarterlyReport",
  "DocumentAnnualReport",
  "DocumentTransitionReport",
  "AmendmentFlag",
  "CurrentFiscalYearEndDate",
  "Security12bTitle",
  "TradingSymbol",
  "SecurityExchangeName",
  "CityAreaCode",
  "LocalPhoneNumber",
]);

/** XBRL text-block tags for qualitative prose (D5). */
export const PROSE_TEXT_BLOCK_CONCEPTS: Record<
  import("@/lib/edgar/discovery/types").ProseSectionKey,
  string[]
> = {
  mda: ["ManagementDiscussionAndAnalysisTextBlock"],
  risk_factors: ["RiskFactorsTextBlock"],
  revenue_concentration: [
    "ConcentrationRiskDisclosureTextBlock",
    "ScheduleOfRevenueByMajorCustomersByReportingPeriodsTableTextBlock",
    "RevenueFromContractWithCustomerTextBlock",
  ],
  subsequent_events: ["SubsequentEventsTextBlock"],
  form_8k_body: [],
  exhibit_99_1: [],
};

export const STANDARD_TAXONOMIES = new Set(["us-gaap", "dei", "ifrs-full", "srt"]);

export const FORWARD_NUMERIC_CONCEPTS = {
  backlog: "RevenueRemainingPerformanceObligation",
  customerConcentration: "ConcentrationRiskPercentage1",
} as const;
