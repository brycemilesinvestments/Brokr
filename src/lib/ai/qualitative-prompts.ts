import type { ProseSection, ProseSectionKey } from "@/lib/edgar/discovery";
import type {
  OutlookSignal,
  SectionQualitativeSignal,
} from "@/lib/ai/qualitative-types";

const SYSTEM_PROMPT = `You convert SEC filing prose into structured signals. Return ONLY valid JSON.
If the section does not contain the requested signal type, return {"found": false}.
Never fabricate numbers, customers, or guidance not explicitly stated in the text.`;

type SectionPromptConfig = {
  outlook?: boolean;
  customers?: boolean;
  guidance?: boolean;
};

const SECTION_PROMPTS: Record<ProseSectionKey, SectionPromptConfig> = {
  business: {},
  risk_factors: { outlook: true },
  mda: { outlook: true },
  financials: {},
  notes: {},
  auditor: {},
  controls: {},
  legal: {},
  subsequent_events: { guidance: true },
  revenue_concentration: { customers: true },
  form_8k_body: {},
  exhibit_99_1: {},
  earnings_call_transcript: { guidance: true, outlook: true },
};

function buildUserPrompt(section: ProseSection, config: SectionPromptConfig): string {
  const parts: string[] = [
    `Section: ${section.key} (${section.concept})`,
    `Text (${section.charCount} chars):`,
    section.text.slice(0, 12_000),
    "",
    "Return JSON with only the requested fields:",
  ];

  if (config.outlook) {
    parts.push(
      '- outlook: { found, summary?, sentiment?: "positive"|"neutral"|"negative"|"mixed", stated_drivers?: string[], stated_risks?: string[] }',
    );
  }
  if (config.customers) {
    parts.push(
      "- customers: { found, concentration_pct?: number, named_customers?: string[], new_vs_existing_language?: string }",
    );
  }
  if (config.guidance) {
    parts.push(
      "- guidance: { found, has_guidance?: boolean, metrics_guided?: string[], ranges?: [{ metric, low?, high?, unit? }] }",
    );
  }

  return parts.join("\n");
}

function parseSectionResponse(
  section: ProseSectionKey,
  raw: unknown,
  config: SectionPromptConfig,
): SectionQualitativeSignal {
  const result: SectionQualitativeSignal = { section };
  if (!raw || typeof raw !== "object") return result;

  const obj = raw as Record<string, unknown>;

  if (config.outlook && obj.outlook && typeof obj.outlook === "object") {
    const o = obj.outlook as Record<string, unknown>;
    result.outlook = {
      found: o.found === true,
      summary: typeof o.summary === "string" ? o.summary : undefined,
      sentiment: isSentiment(o.sentiment) ? o.sentiment : undefined,
      stated_drivers: stringArray(o.stated_drivers),
      stated_risks: stringArray(o.stated_risks),
    };
  }

  if (config.customers && obj.customers && typeof obj.customers === "object") {
    const c = obj.customers as Record<string, unknown>;
    result.customers = {
      found: c.found === true,
      concentration_pct: typeof c.concentration_pct === "number" ? c.concentration_pct : undefined,
      named_customers: stringArray(c.named_customers),
      new_vs_existing_language:
        typeof c.new_vs_existing_language === "string"
          ? c.new_vs_existing_language
          : undefined,
    };
  }

  if (config.guidance && obj.guidance && typeof obj.guidance === "object") {
    const g = obj.guidance as Record<string, unknown>;
    result.guidance = {
      found: g.found === true,
      has_guidance: typeof g.has_guidance === "boolean" ? g.has_guidance : undefined,
      metrics_guided: stringArray(g.metrics_guided),
      ranges: Array.isArray(g.ranges)
        ? g.ranges
            .filter((r): r is Record<string, unknown> => r && typeof r === "object")
            .map((r) => ({
              metric: String(r.metric ?? ""),
              low: typeof r.low === "number" ? r.low : undefined,
              high: typeof r.high === "number" ? r.high : undefined,
              unit: typeof r.unit === "string" ? r.unit : undefined,
            }))
        : undefined,
    };
  }

  return result;
}

function isSentiment(value: unknown): value is OutlookSignal["sentiment"] {
  return (
    value === "positive" ||
    value === "neutral" ||
    value === "negative" ||
    value === "mixed"
  );
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}

export { SYSTEM_PROMPT, SECTION_PROMPTS, buildUserPrompt, parseSectionResponse };
