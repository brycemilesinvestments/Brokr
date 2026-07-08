import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

const CLASSIFICATION_LABELS: Record<string, string> = {
  routine_compensatory: "Compensatory",
  routine_prescheduled: "10b5-1 prescheduled",
  routine_exempt_small: "Small-holder exempt",
  routine_gift: "Gift",
  routine_estate_transfer: "Estate transfer",
  routine_administrative: "Administrative",
  routine_by_code: "Routine (code)",
  non_routine_by_code: "Discretionary (code)",
  needs_ai_review: "Needs review",
  unclassified: "Unclassified",
};

export type ClassificationGroupFilter =
  | "all"
  | "discretionary"
  | "compensatory"
  | "prescheduled"
  | "administrative"
  | "gift_estate"
  | "routine_other"
  | "needs_review";

export const CLASSIFICATION_GROUP_FILTERS: Array<{
  value: ClassificationGroupFilter;
  label: string;
}> = [
  { value: "all", label: "All types" },
  { value: "discretionary", label: "Discretionary" },
  { value: "compensatory", label: "Compensatory" },
  { value: "prescheduled", label: "10b5-1" },
  { value: "administrative", label: "Administrative" },
  { value: "gift_estate", label: "Gift & estate" },
  { value: "routine_other", label: "Other routine" },
  { value: "needs_review", label: "Needs review" },
];

function rawClassification(transaction: InsiderTransaction): string {
  return transaction.footnoteClassification?.trim() || "unclassified";
}

export function formatClassificationLabel(classification?: string | null): string {
  const value = classification?.trim();
  if (!value) return CLASSIFICATION_LABELS.unclassified;
  return CLASSIFICATION_LABELS[value] ?? value.replaceAll("_", " ");
}

export function classificationFilterValue(transaction: InsiderTransaction): string {
  return formatClassificationLabel(transaction.footnoteClassification);
}

export function matchesClassificationGroup(
  transaction: InsiderTransaction,
  filter: ClassificationGroupFilter,
): boolean {
  if (filter === "all") return true;

  const classification = rawClassification(transaction);

  switch (filter) {
    case "discretionary":
      return classification === "non_routine_by_code";
    case "compensatory":
      return classification === "routine_compensatory";
    case "prescheduled":
      return classification === "routine_prescheduled";
    case "administrative":
      return classification === "routine_administrative";
    case "gift_estate":
      return classification === "routine_gift" || classification === "routine_estate_transfer";
    case "routine_other":
      return (
        classification === "routine_by_code" ||
        classification === "routine_exempt_small" ||
        (classification.startsWith("routine_") &&
          ![
            "routine_compensatory",
            "routine_prescheduled",
            "routine_administrative",
            "routine_gift",
            "routine_estate_transfer",
          ].includes(classification))
      );
    case "needs_review":
      return classification === "needs_ai_review" || classification === "unclassified";
    default:
      return true;
  }
}

export function availableClassificationGroupFilters(
  transactions: InsiderTransaction[],
): Array<{ value: ClassificationGroupFilter; label: string }> {
  return CLASSIFICATION_GROUP_FILTERS.filter((filter) => {
    if (filter.value === "all") return true;
    return transactions.some((transaction) => matchesClassificationGroup(transaction, filter.value));
  });
}
