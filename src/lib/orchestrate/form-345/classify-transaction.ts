import { createAiClient, parseJsonFromText, type AiClient } from "@/lib/ai";
import { HAIKU_MODEL } from "@/lib/ai/types";
import {
  extractPlanAdoptionDate,
  hashFootnoteText,
  matchFootnoteCitation,
} from "@/lib/orchestrate/form-345/footnote-utils";
import { loadFootnoteCitations, lookupTransactionCode } from "@/lib/orchestrate/form-345/rulebook";
import type {
  ClassificationTier,
  ClassifiedTransactionRow,
  ParsedOwnershipFiling,
} from "@/lib/orchestrate/form-345/types";
import {
  getFootnoteClassification,
  upsertFootnoteClassification,
} from "@/lib/supabase/form345";

export type ClassifyStats = {
  tier3Calls: number;
  cacheHits: number;
  cacheMisses: number;
};

type Tier1Result = {
  classification: string;
  tier: ClassificationTier;
};

function tier1FromCode(transactionCode: string | null): Tier1Result | null {
  if (!transactionCode) return null;
  const entry = lookupTransactionCode(transactionCode);
  if (!entry) return null;

  return {
    classification: entry.is_routine_default ? "routine_by_code" : "non_routine_by_code",
    tier: 1,
  };
}

function buildAiPrompt(footnoteText: string, transactionCode: string | null): string {
  return `Classify this SEC Form 4 footnote for insider-trading signal analysis.

Transaction code: ${transactionCode ?? "none"}
Footnote text:
"""
${footnoteText}
"""

Return JSON only:
{
  "classification": "short_snake_case_label",
  "rationale": "one sentence"
}`;
}

async function classifyWithAi(
  footnoteText: string,
  transactionCode: string | null,
  ai: AiClient,
): Promise<{ classification: string; rationale: string; model: string }> {
  const response = await ai.complete({
    max_tokens: 256,
    system: "You classify SEC insider filing footnotes. Return JSON only.",
    messages: [{ role: "user", content: buildAiPrompt(footnoteText, transactionCode) }],
  });

  const text = response.content.find((block) => block.type === "text")?.text ?? "";
  const parsed = parseJsonFromText(text) as {
    classification?: string;
    rationale?: string;
  };

  return {
    classification: parsed.classification ?? "unclassified",
    rationale: parsed.rationale ?? "No rationale returned",
    model: ai.getModel(),
  };
}

async function resolveFootnoteClassification(input: {
  footnoteText: string;
  transactionCode: string | null;
  ai?: AiClient;
  stats: ClassifyStats;
}): Promise<{
  footnoteHash: string;
  citationMatched: string | null;
  classification: string;
  planAdoptionDate: string | null;
  tier: ClassificationTier;
  needsAiReview: boolean;
  aiModelUsed: string | null;
  aiClassificationText: string | null;
}> {
  const footnoteHash = hashFootnoteText(input.footnoteText);
  const cached = await getFootnoteClassification(footnoteHash);

  if (cached) {
    input.stats.cacheHits += 1;
    return {
      footnoteHash,
      citationMatched: cached.citation_matched,
      classification: cached.classification,
      planAdoptionDate:
        cached.requires_date_extraction ? extractPlanAdoptionDate(input.footnoteText) : null,
      tier: 2,
      needsAiReview: input.transactionCode === "J",
      aiModelUsed: cached.ai_model_used,
      aiClassificationText: cached.ai_classification_text,
    };
  }

  input.stats.cacheMisses += 1;
  const citations = loadFootnoteCitations();
  const matched = matchFootnoteCitation(input.footnoteText, citations);

  if (matched && input.transactionCode !== "J") {
    const planAdoptionDate = matched.requires_date_extraction
      ? extractPlanAdoptionDate(input.footnoteText)
      : null;

    await upsertFootnoteClassification({
      footnoteHash,
      normalizedText: input.footnoteText,
      classification: matched.classification,
      citationMatched: matched.rule_ref,
      requiresDateExtraction: matched.requires_date_extraction,
      classificationTier: 2,
    });

    return {
      footnoteHash,
      citationMatched: matched.rule_ref,
      classification: matched.classification,
      planAdoptionDate,
      tier: 2,
      needsAiReview: false,
      aiModelUsed: null,
      aiClassificationText: null,
    };
  }

  if (!input.ai) {
    return {
      footnoteHash,
      citationMatched: null,
      classification: "needs_ai_review",
      planAdoptionDate: null,
      tier: 3,
      needsAiReview: true,
      aiModelUsed: null,
      aiClassificationText: null,
    };
  }

  input.stats.tier3Calls += 1;
  const aiResult = await classifyWithAi(input.footnoteText, input.transactionCode, input.ai);

  await upsertFootnoteClassification({
    footnoteHash,
    normalizedText: input.footnoteText,
    classification: aiResult.classification,
    citationMatched: null,
    requiresDateExtraction: false,
    classificationTier: 3,
    aiModelUsed: aiResult.model,
    aiClassificationText: aiResult.rationale,
  });

  return {
    footnoteHash,
    citationMatched: null,
    classification: aiResult.classification,
    planAdoptionDate: null,
    tier: 3,
    needsAiReview: true,
    aiModelUsed: aiResult.model,
    aiClassificationText: aiResult.rationale,
  };
}

export async function classifyOwnershipRows(
  parsed: ParsedOwnershipFiling,
  options: { ai?: AiClient } = {},
): Promise<{ rows: ClassifiedTransactionRow[]; stats: ClassifyStats }> {
  const stats: ClassifyStats = { tier3Calls: 0, cacheHits: 0, cacheMisses: 0 };
  const ai = options.ai;

  const classified: ClassifiedTransactionRow[] = [];

  for (const row of parsed.rows) {
    const tier1 = tier1FromCode(row.transactionCode);
    let result: ClassifiedTransactionRow = {
      ...row,
      footnoteHash: null,
      footnoteCitationMatched: null,
      footnoteClassification: tier1?.classification ?? null,
      planAdoptionDate: null,
      classificationTier: tier1?.tier ?? 1,
      needsAiReview: row.transactionCode === "J",
      aiModelUsed: null,
      aiClassificationText: null,
      vestingEventId: null,
    };

    if (row.footnoteRawText) {
      const footnoteResult = await resolveFootnoteClassification({
        footnoteText: row.footnoteRawText,
        transactionCode: row.transactionCode,
        ai,
        stats,
      });

      result = {
        ...result,
        footnoteHash: footnoteResult.footnoteHash,
        footnoteCitationMatched: footnoteResult.citationMatched,
        footnoteClassification: footnoteResult.classification,
        planAdoptionDate: footnoteResult.planAdoptionDate,
        classificationTier: footnoteResult.tier,
        needsAiReview: footnoteResult.needsAiReview || row.transactionCode === "J",
        aiModelUsed: footnoteResult.aiModelUsed,
        aiClassificationText: footnoteResult.aiClassificationText,
      };

      if (row.is10b51Checkbox && !result.planAdoptionDate) {
        const planDate = extractPlanAdoptionDate(row.footnoteRawText);
        if (planDate) {
          result = { ...result, planAdoptionDate: planDate };
        }
      }
    } else if (row.is10b51Checkbox) {
      result = {
        ...result,
        footnoteClassification: result.footnoteClassification ?? "routine_prescheduled",
        needsAiReview: row.transactionCode === "J",
      };
    }

    classified.push(result);
  }

  return { rows: classified, stats };
}

export function createForm345AiClient(): AiClient | undefined {
  try {
    return createAiClient({ model: HAIKU_MODEL });
  } catch {
    return undefined;
  }
}
