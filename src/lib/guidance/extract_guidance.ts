import { parseJsonFromText, type AiClient } from "@/lib/ai";
import type {
  GuidanceAiExtractor,
  GuidanceAiInput,
  GuidanceAiResult,
  GuidanceExtraction,
  GuidanceMetric,
  GuidanceRange,
  TaggedNumber,
} from "@/lib/guidance/types";

const SYSTEM_PROMPT = `You extract earnings guidance from SEC filing metadata.
Return JSON only.
If no guidance is present return:
{"found":false,"hasGuidance":false,"ranges":[]}
Never invent numbers not present in provided data.`;

function toMetric(value: unknown): GuidanceMetric {
  if (typeof value !== "string") return "other";
  switch (value) {
    case "revenue":
    case "eps":
    case "ebitda":
    case "operating_income":
    case "gross_margin":
    case "net_income":
    case "cash_flow":
    case "capex":
      return value;
    default:
      return "other";
  }
}

function toRanges(value: unknown): GuidanceRange[] {
  if (!Array.isArray(value)) return [];

  const ranges: GuidanceRange[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    ranges.push({
      metric: toMetric(obj.metric),
      low: typeof obj.low === "number" ? obj.low : undefined,
      high: typeof obj.high === "number" ? obj.high : undefined,
      unit: typeof obj.unit === "string" ? obj.unit : undefined,
      note: typeof obj.note === "string" ? obj.note : undefined,
    });
  }
  return ranges;
}

function parseGuidance(raw: unknown, rawResponseText?: string): GuidanceExtraction {
  if (!raw || typeof raw !== "object") {
    return { found: false, hasGuidance: false, ranges: [], rawResponseText };
  }

  const obj = raw as Record<string, unknown>;
  return {
    found: obj.found === true,
    hasGuidance: obj.hasGuidance === true,
    summary: typeof obj.summary === "string" ? obj.summary : undefined,
    ranges: toRanges(obj.ranges),
    rawResponseText,
  };
}

function buildUserPrompt(input: GuidanceAiInput): string {
  const numbers = input.taggedNumbers.slice(0, 80).map((n) => ({
    metric: n.metric,
    concept: n.concept,
    value: n.value,
    periodEnd: n.periodEnd,
    unit: n.unit,
  }));

  return [
    `CIK: ${input.cik}`,
    `Accession: ${input.filing.accessionNumber}`,
    `Form: ${input.filing.form}`,
    `Filing Date: ${input.filing.filingDate}`,
    `Primary Document: ${input.filing.primaryDocument ?? "unknown"}`,
    "",
    "Tagged numbers (deterministic extraction):",
    JSON.stringify(numbers, null, 2),
    "",
    'Return JSON: {"found":boolean,"hasGuidance":boolean,"summary"?:string,"ranges":[{"metric":string,"low"?:number,"high"?:number,"unit"?:string,"note"?:string}]}',
  ].join("\n");
}

async function defaultAiExtractor(client: AiClient, input: GuidanceAiInput): Promise<GuidanceAiResult> {
  const response = await client.complete({
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const rawText = response.content.find((c) => c.type === "text")?.text ?? "";
  let parsed: unknown;
  try {
    parsed = parseJsonFromText(rawText);
  } catch {
    parsed = null;
  }

  const costUsd = response.usage
    ? client.estimateCostUsd(response.usage.input_tokens, response.usage.output_tokens)
    : 0;

  return {
    guidance: parseGuidance(parsed, rawText),
    costUsd,
  };
}

/**
 * G4 — Extract structured guidance using injected AI extractor.
 */
export async function extract_guidance(args: {
  input: GuidanceAiInput;
  aiClient?: AiClient;
  extractor?: GuidanceAiExtractor;
}): Promise<GuidanceAiResult> {
  if (args.extractor) {
    return args.extractor(args.input);
  }
  if (args.aiClient) {
    return defaultAiExtractor(args.aiClient, args.input);
  }

  return {
    guidance: {
      found: false,
      hasGuidance: false,
      ranges: [],
      summary: "No AI extractor configured",
    },
    costUsd: 0,
  };
}

function make_noop_guidance_extractor(
  guidance: GuidanceExtraction = { found: false, hasGuidance: false, ranges: [] },
): GuidanceAiExtractor {
  return async () => ({ guidance, costUsd: 0 });
}

export function latest_actual_by_metric(taggedNumbers: TaggedNumber[]): Map<GuidanceMetric, TaggedNumber> {
  const byMetric = new Map<GuidanceMetric, TaggedNumber>();

  for (const row of taggedNumbers) {
    const existing = byMetric.get(row.metric);
    if (!existing) {
      byMetric.set(row.metric, row);
      continue;
    }

    const existingDate = existing.periodEnd ?? "";
    const rowDate = row.periodEnd ?? "";
    if (rowDate > existingDate) {
      byMetric.set(row.metric, row);
    }
  }

  return byMetric;
}
