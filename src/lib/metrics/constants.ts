import type { ExtendedConceptKey } from "@/lib/metrics/types";

/** Chunk 7 concepts beyond the Chunk 3 whitelist. */
const EXTENDED_CONCEPTS: ExtendedConceptKey[] = [
  "PaymentsToAcquirePropertyPlantAndEquipment",
  "ShareBasedCompensation",
  "RevenueRemainingPerformanceObligation",
  "AccountsReceivableNetCurrent",
  "InventoryNet",
  "AccountsPayableCurrent",
];

export const REVENUE_CONCEPT = "RevenueFromContractWithCustomerExcludingAssessedTax";
export const OPERATING_CF_CONCEPT = "NetCashProvidedByUsedInOperatingActivities";
export const COGS_CONCEPT = "CostOfGoodsAndServicesSold";
export const DILUTED_SHARES_CONCEPT = "WeightedAverageNumberOfDilutedSharesOutstanding";
