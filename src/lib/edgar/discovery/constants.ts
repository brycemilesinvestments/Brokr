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

/** XBRL text-block tags for qualitative prose (D5 / K1). */
export const PROSE_TEXT_BLOCK_CONCEPTS: Record<
  import("@/lib/edgar/discovery/types").ProseSectionKey,
  string[]
> = {
  business: ["BusinessDescription", "DescriptionOfBusinessTextBlock"],
  mda: ["ManagementDiscussionAndAnalysisTextBlock"],
  risk_factors: ["RiskFactorsTextBlock"],
  financials: [
    "FinancialStatementsTextBlock",
    "ConsolidatedFinancialStatementsTextBlock",
  ],
  notes: [
    "NotesToFinancialStatementsTextBlock",
    "SignificantAccountingPoliciesTextBlock",
  ],
  auditor: [
    "AuditOpinionTextBlock",
    "IndependentAuditorsReportTextBlock",
    "AuditorsReportTextBlock",
  ],
  controls: [
    "ManagementReportOnInternalControlOverFinancialReportingTextBlock",
    "DisclosureControlsAndProceduresTextBlock",
  ],
  legal: ["LegalProceedingsTextBlock"],
  subsequent_events: ["SubsequentEventsTextBlock"],
  revenue_concentration: [
    "ConcentrationRiskDisclosureTextBlock",
    "ScheduleOfRevenueByMajorCustomersByReportingPeriodsTableTextBlock",
    "RevenueFromContractWithCustomerTextBlock",
  ],
  form_8k_body: [],
  exhibit_99_1: [],
  earnings_call_transcript: [],
};

/** XBRL concepts for auditor name extraction (K11). */
export const AUDITOR_NAME_CONCEPTS = [
  "AuditorName",
  "AuditorsName",
  "NameOfAuditor",
] as const;

export const STANDARD_TAXONOMIES = new Set(["us-gaap", "dei", "ifrs-full", "srt"]);

export const FORWARD_NUMERIC_CONCEPTS = {
  backlog: "RevenueRemainingPerformanceObligation",
  customerConcentration: "ConcentrationRiskPercentage1",
} as const;
