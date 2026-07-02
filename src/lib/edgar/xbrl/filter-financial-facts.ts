import type { XbrlContext, XbrlFact } from "@/lib/edgar/xbrl/types";

export const INCOME_STATEMENT = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "CostOfGoodsAndServicesSold",
  "GrossProfit",
  "ResearchAndDevelopmentExpense",
  "SellingGeneralAndAdministrativeExpense",
  "OperatingIncomeLoss",
  "NetIncomeLoss",
  "EarningsPerShareBasic",
  "EarningsPerShareDiluted",
] as const;

export const BALANCE_SHEET = [
  "CashAndCashEquivalentsAtCarryingValue",
  "AccountsReceivableNetCurrent",
  "InventoryNet",
  "AssetsCurrent",
  "Assets",
  "LiabilitiesCurrent",
  "LongTermDebtNoncurrent",
  "Liabilities",
  "StockholdersEquity",
] as const;

export const CASH_FLOW = [
  "NetCashProvidedByUsedInOperatingActivities",
  "NetCashProvidedByUsedInInvestingActivities",
  "NetCashProvidedByUsedInFinancingActivities",
] as const;

export const SHARE_DATA = [
  "EntityCommonStockSharesOutstanding",
  "WeightedAverageNumberOfSharesOutstandingBasic",
  "WeightedAverageNumberOfDilutedSharesOutstanding",
  "CommonStockSharesAuthorized",
] as const;

export type FinancialStatementCategory = "income" | "balance" | "cash_flow" | "shares";

export type FinancialPeriodKind = "quarter" | "ytd" | "instant" | "cover";

export type FinancialStatementRow = {
  concept: string;
  label: string;
  category: FinancialStatementCategory;
  periodKind: FinancialPeriodKind;
  current?: XbrlFact;
  prior?: XbrlFact;
  currentPeriodLabel?: string;
  priorPeriodLabel?: string;
};

const WHITELIST = new Set<string>([
  ...INCOME_STATEMENT,
  ...BALANCE_SHEET,
  ...CASH_FLOW,
  ...SHARE_DATA,
]);

const CATEGORY_BY_CONCEPT = new Map<string, FinancialStatementCategory>([
  ...INCOME_STATEMENT.map((concept) => [concept, "income"] as const),
  ...BALANCE_SHEET.map((concept) => [concept, "balance"] as const),
  ...CASH_FLOW.map((concept) => [concept, "cash_flow"] as const),
  ...SHARE_DATA.map((concept) => [concept, "shares"] as const),
]);

const CONCEPT_ORDER = new Map<string, number>(
  [...INCOME_STATEMENT, ...BALANCE_SHEET, ...CASH_FLOW, ...SHARE_DATA].map(
    (concept, index) => [concept, index],
  ),
);

const ALLOWED_TAXONOMIES = new Set(["us-gaap", "ifrs-full"]);
const DEI_SHARE_CONCEPTS = new Set<string>(SHARE_DATA);

type DurationPeriod = {
  contextRef: string;
  context: XbrlContext;
  days: number;
};

type CanonicalContexts = {
  quarterCurrent?: DurationPeriod;
  quarterPrior?: DurationPeriod;
  ytdCurrent?: DurationPeriod;
  ytdPrior?: DurationPeriod;
  instantCurrent?: XbrlContext;
  instantPrior?: XbrlContext;
  coverInstant?: XbrlContext;
  allowedContextRefs: Set<string>;
};

function durationDays(context: XbrlContext): number | undefined {
  if (context.periodType !== "duration" || !context.startDate || !context.endDate) {
    return undefined;
  }
  const days = (Date.parse(context.endDate) - Date.parse(context.startDate)) / 86_400_000;
  return Number.isFinite(days) ? days : undefined;
}

function periodKey(context?: XbrlContext): string {
  if (!context) return "";
  if (context.periodType === "instant") return `instant:${context.instant ?? ""}`;
  return `duration:${context.startDate ?? ""}:${context.endDate ?? ""}`;
}

function formatDurationLabel(context?: XbrlContext): string | undefined {
  if (!context) return undefined;
  if (context.periodType === "instant") return context.instant;
  if (context.startDate && context.endDate) {
    return `${context.startDate} → ${context.endDate}`;
  }
  return undefined;
}

function isWhitelistedFact(fact: XbrlFact): boolean {
  if (!WHITELIST.has(fact.concept)) return false;
  if (fact.concept.includes("TextBlock")) return false;

  if (fact.taxonomy === "dei") {
    return DEI_SHARE_CONCEPTS.has(fact.concept);
  }

  return ALLOWED_TAXONOMIES.has(fact.taxonomy);
}

function uniqueDurationPeriods(facts: XbrlFact[]): DurationPeriod[] {
  const byKey = new Map<string, DurationPeriod>();

  for (const fact of facts) {
    const context = fact.context;
    if (!context || context.periodType !== "duration") continue;
    const days = durationDays(context);
    if (days === undefined) continue;

    const key = periodKey(context);
    if (!byKey.has(key)) {
      byKey.set(key, { contextRef: fact.contextRef, context, days });
    }
  }

  return [...byKey.values()];
}

function pickPriorDuration(
  current: DurationPeriod,
  candidates: DurationPeriod[],
): DurationPeriod | undefined {
  const targetDays = current.days;
  const currentEnd = Date.parse(current.context.endDate ?? "");

  return candidates
    .filter((candidate) => {
      if (candidate.contextRef === current.contextRef) return false;
      const end = Date.parse(candidate.context.endDate ?? "");
      if (!Number.isFinite(end) || end >= currentEnd) return false;
      const dayDelta = Math.abs(candidate.days - targetDays);
      return dayDelta <= 10;
    })
    .sort((a, b) => {
      const endDiffA = Math.abs(
        currentEnd -
          365.25 * 86_400_000 -
          Date.parse(a.context.endDate ?? ""),
      );
      const endDiffB = Math.abs(
        currentEnd -
          365.25 * 86_400_000 -
          Date.parse(b.context.endDate ?? ""),
      );
      return endDiffA - endDiffB;
    })[0];
}

function detectBalanceSheetInstants(
  facts: XbrlFact[],
): { current?: XbrlContext; prior?: XbrlContext } {
  const anchorFacts = facts.filter(
    (fact) =>
      fact.concept === "Assets" &&
      fact.taxonomy === "us-gaap" &&
      fact.context?.periodType === "instant" &&
      fact.context.instant,
  );

  const bestByInstant = new Map<string, XbrlFact>();
  for (const fact of anchorFacts) {
    const instant = fact.context!.instant!;
    const existing = bestByInstant.get(instant);
    if (
      !existing ||
      Math.abs(fact.numericValue ?? 0) > Math.abs(existing.numericValue ?? 0)
    ) {
      bestByInstant.set(instant, fact);
    }
  }

  const sorted = [...bestByInstant.values()].sort(
    (a, b) => Date.parse(b.context!.instant!) - Date.parse(a.context!.instant!),
  );

  return {
    current: sorted[0]?.context,
    prior: sorted[1]?.context,
  };
}

function detectCanonicalContexts(facts: XbrlFact[]): CanonicalContexts {
  const whitelisted = facts.filter(isWhitelistedFact);
  const durations = uniqueDurationPeriods(
    whitelisted.filter((fact) => CATEGORY_BY_CONCEPT.get(fact.concept) !== "balance"),
  );

  const sortedByEnd = [...durations].sort(
    (a, b) =>
      Date.parse(b.context.endDate ?? "") - Date.parse(a.context.endDate ?? ""),
  );

  const shortest = [...durations].sort((a, b) => a.days - b.days)[0];
  const quarterCurrent =
    sortedByEnd.find((period) => period.days <= 120) ??
    shortest;
  const quarterPrior = quarterCurrent
    ? pickPriorDuration(quarterCurrent, durations)
    : undefined;

  const ytdCurrent = sortedByEnd.find((period) => period.days > 120) ?? sortedByEnd[0];
  const ytdPrior = ytdCurrent ? pickPriorDuration(ytdCurrent, durations) : undefined;

  const { current: instantCurrent, prior: instantPrior } =
    detectBalanceSheetInstants(whitelisted);

  const coverInstant = whitelisted
    .filter((fact) => fact.concept === "EntityCommonStockSharesOutstanding")
    .map((fact) => fact.context)
    .find((context) => context?.periodType === "instant");

  const allowedContextRefs = new Set<string>();
  for (const period of [quarterCurrent, quarterPrior, ytdCurrent, ytdPrior]) {
    if (period) allowedContextRefs.add(period.contextRef);
  }
  if (instantCurrent) allowedContextRefs.add(instantCurrent.id);
  if (instantPrior) allowedContextRefs.add(instantPrior.id);
  if (coverInstant) allowedContextRefs.add(coverInstant.id);

  return {
    quarterCurrent,
    quarterPrior,
    ytdCurrent,
    ytdPrior,
    instantCurrent,
    instantPrior,
    coverInstant,
    allowedContextRefs,
  };
}

function pickFact(
  facts: XbrlFact[],
  concept: string,
  contextRef?: string,
): XbrlFact | undefined {
  if (!contextRef) return undefined;

  const matches = facts.filter(
    (fact) =>
      fact.concept === concept &&
      fact.contextRef === contextRef &&
      isWhitelistedFact(fact),
  );

  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  return matches.sort((a, b) => {
    const aValue = Math.abs(a.numericValue ?? 0);
    const bValue = Math.abs(b.numericValue ?? 0);
    return bValue - aValue;
  })[0];
}

function humanizeConcept(concept: string): string {
  return concept
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Noncurrent/g, "Non-current")
    .replace(/Earnings Per Share/g, "EPS");
}

function buildRow(
  concept: string,
  category: FinancialStatementCategory,
  periodKind: FinancialPeriodKind,
  current?: XbrlFact,
  prior?: XbrlFact,
): FinancialStatementRow | undefined {
  if (!current && !prior) return undefined;

  return {
    concept,
    label: humanizeConcept(concept),
    category,
    periodKind,
    current,
    prior,
    currentPeriodLabel: formatDurationLabel(current?.context),
    priorPeriodLabel: formatDurationLabel(prior?.context),
  };
}

export function filterFinancialStatements(facts: XbrlFact[]): FinancialStatementRow[] {
  const canonical = detectCanonicalContexts(facts);
  const scoped = facts.filter(
    (fact) => isWhitelistedFact(fact) && canonical.allowedContextRefs.has(fact.contextRef),
  );

  const rows: FinancialStatementRow[] = [];

  for (const concept of INCOME_STATEMENT) {
    const quarterRow = buildRow(
      concept,
      "income",
      "quarter",
      pickFact(scoped, concept, canonical.quarterCurrent?.contextRef),
      pickFact(scoped, concept, canonical.quarterPrior?.contextRef),
    );
    if (quarterRow) rows.push(quarterRow);

    const ytdRow = buildRow(
      concept,
      "income",
      "ytd",
      pickFact(scoped, concept, canonical.ytdCurrent?.contextRef),
      pickFact(scoped, concept, canonical.ytdPrior?.contextRef),
    );
    if (ytdRow) rows.push(ytdRow);
  }

  for (const concept of BALANCE_SHEET) {
    const row = buildRow(
      concept,
      "balance",
      "instant",
      pickFact(scoped, concept, canonical.instantCurrent?.id),
      pickFact(scoped, concept, canonical.instantPrior?.id),
    );
    if (row) rows.push(row);
  }

  for (const concept of CASH_FLOW) {
    const row = buildRow(
      concept,
      "cash_flow",
      "ytd",
      pickFact(scoped, concept, canonical.ytdCurrent?.contextRef),
      pickFact(scoped, concept, canonical.ytdPrior?.contextRef),
    );
    if (row) rows.push(row);
  }

  for (const concept of SHARE_DATA) {
    if (concept === "EntityCommonStockSharesOutstanding") {
      const row = buildRow(
        concept,
        "shares",
        "cover",
        pickFact(facts.filter(isWhitelistedFact), concept, canonical.coverInstant?.id),
        undefined,
      );
      if (row) rows.push(row);
      continue;
    }

    if (concept === "CommonStockSharesAuthorized") {
      const row = buildRow(
        concept,
        "shares",
        "instant",
        pickFact(scoped, concept, canonical.instantCurrent?.id),
        pickFact(scoped, concept, canonical.instantPrior?.id),
      );
      if (row) rows.push(row);
      continue;
    }

    const row = buildRow(
      concept,
      "shares",
      "quarter",
      pickFact(scoped, concept, canonical.quarterCurrent?.contextRef),
      pickFact(scoped, concept, canonical.quarterPrior?.contextRef),
    );
    if (row) rows.push(row);
  }

  return rows.sort(
    (a, b) => (CONCEPT_ORDER.get(a.concept) ?? 0) - (CONCEPT_ORDER.get(b.concept) ?? 0),
  );
}
