import type { XbrlFact } from "@/lib/edgar";
import type {
  SegmentBreakout,
  SegmentDimension,
  SegmentSeries,
  SegmentSeriesPoint,
} from "@/lib/metrics/types";

const DISAGGREGATION_CONCEPT = "DisaggregationOfRevenueTableTextBlock";
const MILLIONS_MULTIPLIER = 1_000_000;

const END_MARKET_SEGMENTS = ["Datacenter", "Edge", "Consumer"] as const;
const GEOGRAPHY_SEGMENTS = ["Asia", "Americas", "Europe, Middle East and Africa"] as const;

const END_MARKET_LABELS: Record<(typeof END_MARKET_SEGMENTS)[number], string> = {
  Datacenter: "datacenter",
  Edge: "edge",
  Consumer: "consumer",
};

const GEOGRAPHY_LABELS: Record<(typeof GEOGRAPHY_SEGMENTS)[number], string> = {
  Asia: "Asia",
  Americas: "Americas",
  "Europe, Middle East and Africa": "EMEA",
};

const MONTH_INDEX: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

type ParsedSegmentRow = {
  rawName: string;
  valuesMillions: number[];
};

type ParsedDisaggregationTable = {
  threeMonthPeriodEnds: [string, string];
  rows: Array<ParsedSegmentRow & { dimension: SegmentDimension }>;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseFilingDateLabel(label: string): string | undefined {
  const match = label.match(/([A-Z][a-z]+) (\d{1,2}),\s*(\d{4})/);
  if (!match) return undefined;

  const month = MONTH_INDEX[match[1]];
  if (!month) return undefined;

  const day = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${String(month).padStart(2, "0")}-${day}`;
}

function extractPeriodEnds(text: string): [string, string] | undefined {
  const dates = [...text.matchAll(/([A-Z][a-z]+ \d{1,2}),\s*(\d{4})/g)].map((match) =>
    parseFilingDateLabel(match[0]),
  );

  const unique = [...new Set(dates.filter((date): date is string => Boolean(date)))];
  if (unique.length < 2) return undefined;

  return [unique[0], unique[1]];
}

function parseSectionRows(sectionText: string, segmentNames: readonly string[]): ParsedSegmentRow[] {
  const rows: ParsedSegmentRow[] = [];

  for (const name of segmentNames) {
    const index = sectionText.indexOf(name);
    if (index === -1) continue;

    const afterName = sectionText.slice(index + name.length);
    const valuesMillions = [...afterName.matchAll(/\$?([\d,]+)/g)]
      .slice(0, 4)
      .map((match) => Number(match[1].replace(/,/g, "")))
      .filter((value) => !Number.isNaN(value));

    if (valuesMillions.length < 2) continue;

    rows.push({ rawName: name, valuesMillions });
  }

  return rows;
}

export function parseDisaggregationTableText(text: string): ParsedDisaggregationTable | null {
  const normalized = normalizeWhitespace(text);
  const periodEnds = extractPeriodEnds(normalized);
  if (!periodEnds) return null;

  const body = normalized.split(/\(in millions\)/i)[1];
  if (!body) return null;

  const [endMarketSection, geographySection = ""] = body.split(/Revenue by geography:/i);
  if (!/Revenue by end market:/i.test(endMarketSection)) return null;

  const endMarketBody = endMarketSection.split(/Revenue by end market:/i)[1] ?? "";
  const endMarketRows = parseSectionRows(endMarketBody, END_MARKET_SEGMENTS).map((row) => ({
    ...row,
    dimension: "end_market" as const,
  }));
  const geographyRows = parseSectionRows(geographySection, GEOGRAPHY_SEGMENTS).map((row) => ({
    ...row,
    dimension: "geography" as const,
  }));

  if (endMarketRows.length === 0 && geographyRows.length === 0) return null;

  return {
    threeMonthPeriodEnds: periodEnds,
    rows: [...endMarketRows, ...geographyRows],
  };
}

function segmentLabel(row: ParsedSegmentRow & { dimension: SegmentDimension }): string {
  if (row.dimension === "end_market") {
    return END_MARKET_LABELS[row.rawName as (typeof END_MARKET_SEGMENTS)[number]] ?? row.rawName;
  }

  return GEOGRAPHY_LABELS[row.rawName as (typeof GEOGRAPHY_SEGMENTS)[number]] ?? row.rawName;
}

function quarterlyPoint(
  periodEnd: string,
  valueMillions: number,
  fy?: number,
  fp?: string,
): SegmentSeriesPoint {
  return {
    periodEnd,
    frequency: "quarterly",
    value: valueMillions * MILLIONS_MULTIPLIER,
    fy,
    fp,
  };
}

function fiscalMetadataFromDei(facts: XbrlFact[]): { fy?: number; fp?: string; periodEnd?: string } {
  const fyFact = facts.find((fact) => fact.concept === "DocumentFiscalYearFocus");
  const fpFact = facts.find((fact) => fact.concept === "DocumentFiscalPeriodFocus");
  const periodFact = facts.find((fact) => fact.concept === "DocumentPeriodEndDate");

  const fy = fyFact?.value ? Number(fyFact.value) : undefined;
  const fp = fpFact?.value?.trim() || undefined;
  const periodEnd = periodFact?.value ? parseFilingDateLabel(periodFact.value) : undefined;

  return {
    fy: Number.isFinite(fy) ? fy : undefined,
    fp,
    periodEnd,
  };
}

function buildSegmentSeries(
  rows: Array<ParsedSegmentRow & { dimension: SegmentDimension }>,
  dimension: SegmentDimension,
  periodEnds: [string, string],
  fiscal: { fy?: number; fp?: string; periodEnd?: string },
): SegmentSeries[] {
  const dimensionRows = rows.filter((row) => row.dimension === dimension);
  const [currentPeriodEnd, priorPeriodEnd] = periodEnds;

  return dimensionRows.map((row) => {
    const quarterly: SegmentSeriesPoint[] = [];
    const [currentMillions, priorMillions] = row.valuesMillions;

    if (currentMillions !== undefined) {
      const isCurrent =
        fiscal.periodEnd === undefined || fiscal.periodEnd === currentPeriodEnd;
      quarterly.push(
        quarterlyPoint(
          currentPeriodEnd,
          currentMillions,
          isCurrent ? fiscal.fy : undefined,
          isCurrent ? fiscal.fp : undefined,
        ),
      );
    }

    if (priorMillions !== undefined) {
      const priorFy =
        fiscal.fy !== undefined && fiscal.periodEnd === currentPeriodEnd
          ? fiscal.fy - 1
          : undefined;
      quarterly.push(
        quarterlyPoint(priorPeriodEnd, priorMillions, priorFy, fiscal.fp),
      );
    }

    return {
      segmentName: segmentLabel(row),
      dimension,
      status: "reported" as const,
      unit: "USD",
      annual: [],
      quarterly: quarterly.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd)),
    };
  });
}

function mergeSegmentSeries(existing: SegmentSeries[], incoming: SegmentSeries[]): SegmentSeries[] {
  const byKey = new Map<string, SegmentSeries>();

  for (const series of [...existing, ...incoming]) {
    const key = `${series.dimension}:${series.segmentName}`;
    const prior = byKey.get(key);

    if (!prior) {
      byKey.set(key, series);
      continue;
    }

    const quarterly = [...prior.quarterly, ...series.quarterly];
    const dedupedQuarterly = [...new Map(quarterly.map((point) => [point.periodEnd, point])).values()].sort(
      (a, b) => a.periodEnd.localeCompare(b.periodEnd),
    );

    byKey.set(key, {
      ...prior,
      quarterly: dedupedQuarterly,
      annual: [...prior.annual, ...series.annual],
    });
  }

  return [...byKey.values()];
}

/** C7.4 — disaggregated revenue by end-market and geography from iXBRL text blocks. */
export function computeSegmentBreakout(ixbrlFacts: XbrlFact[] = []): SegmentBreakout {
  if (ixbrlFacts.length === 0) {
    return { endMarket: [], geography: [] };
  }

  const fiscal = fiscalMetadataFromDei(ixbrlFacts);
  const textBlocks = ixbrlFacts.filter((fact) => fact.concept === DISAGGREGATION_CONCEPT);

  let endMarket: SegmentSeries[] = [];
  let geography: SegmentSeries[] = [];

  for (const fact of textBlocks) {
    const parsed = parseDisaggregationTableText(fact.value);
    if (!parsed) continue;

    endMarket = mergeSegmentSeries(
      endMarket,
      buildSegmentSeries(parsed.rows, "end_market", parsed.threeMonthPeriodEnds, fiscal),
    );
    geography = mergeSegmentSeries(
      geography,
      buildSegmentSeries(parsed.rows, "geography", parsed.threeMonthPeriodEnds, fiscal),
    );
  }

  return { endMarket, geography };
}
