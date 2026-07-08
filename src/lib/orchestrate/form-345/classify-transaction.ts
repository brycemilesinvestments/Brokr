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

/** Specific attribution when the transaction code alone is informative. */
const CODE_SPECIFIC_CLASSIFICATION: Record<string, string> = {
  A: "routine_compensatory",
  D: "routine_compensatory",
  F: "routine_compensatory",
  I: "routine_compensatory",
  M: "routine_compensatory",
  G: "routine_gift",
  L: "routine_exempt_small",
  W: "routine_estate_transfer",
  Z: "routine_administrative",
  P: "non_routine_by_code",
  S: "non_routine_by_code",
  K: "non_routine_by_code",
  U: "non_routine_by_code",
};

function codeDefaultClassification(transactionCode: string | null): string | null {
  if (!transactionCode) return null;
  const code = transactionCode.toUpperCase();
  if (code === "J") return null;

  const specific = CODE_SPECIFIC_CLASSIFICATION[code];
  if (specific) return specific;

  const entry = lookupTransactionCode(code);
  if (!entry) return null;

  return entry.is_routine_default ? "routine_by_code" : "non_routine_by_code";
}

function tier1FromCode(transactionCode: string | null): Tier1Result | null {
  const classification = codeDefaultClassification(transactionCode);
  if (!classification) return null;

  return {
    classification,
    tier: 1,
  };
}

function buildAiPrompt(
  footnoteText: string,
  transactionCode: string | null,
  suggestedClassification: string | null,
): string {
  const suggestion = suggestedClassification
    ? `Suggested classification (validate or correct): ${suggestedClassification}`
    : "No rulebook match — classify from the footnote narrative.";

  return `Classify this SEC Form 4 footnote for insider-trading signal analysis.

Transaction code: ${transactionCode ?? "none"}
${suggestion}

Use one of these labels when applicable:
routine_compensatory, routine_prescheduled, routine_exempt_small, routine_gift,
routine_estate_transfer, routine_administrative, routine_by_code, non_routine_by_code

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

function citationIsAuthoritative(matched: { rule_ref: string | null }): boolean {
  return matched.rule_ref?.startsWith("Rule") ?? false;
}

async function classifyWithAi(
  footnoteText: string,
  transactionCode: string | null,
  ai: AiClient,
  suggestedClassification: string | null,
): Promise<{ classification: string; rationale: string; model: string }> {
  const response = await ai.complete({
    max_tokens: 256,
    system:
      "You classify SEC insider filing footnotes for trading-signal analysis. Prefer the suggested label when the footnote supports it. Return JSON only.",
    messages: [
      {
        role: "user",
        content: buildAiPrompt(footnoteText, transactionCode, suggestedClassification),
      },
    ],
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

async function persistAiClassification(input: {
  footnoteHash: string;
  footnoteText: string;
  aiResult: { classification: string; rationale: string; model: string };
}): Promise<void> {
  await upsertFootnoteClassification({
    footnoteHash: input.footnoteHash,
    normalizedText: input.footnoteText,
    classification: input.aiResult.classification,
    citationMatched: null,
    requiresDateExtraction: false,
    classificationTier: 3,
    aiModelUsed: input.aiResult.model,
    aiClassificationText: input.aiResult.rationale,
  });
}

async function classifyWithAiAndPersist(input: {
  footnoteHash: string;
  footnoteText: string;
  transactionCode: string | null;
  ai: AiClient;
  suggestedClassification: string | null;
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
  input.stats.tier3Calls += 1;
  const aiResult = await classifyWithAi(
    input.footnoteText,
    input.transactionCode,
    input.ai,
    input.suggestedClassification,
  );

  await persistAiClassification({
    footnoteHash: input.footnoteHash,
    footnoteText: input.footnoteText,
    aiResult,
  });

  return {
    footnoteHash: input.footnoteHash,
    citationMatched: null,
    classification: aiResult.classification,
    planAdoptionDate: null,
    tier: 3,
    needsAiReview: false,
    aiModelUsed: aiResult.model,
    aiClassificationText: aiResult.rationale,
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
  const canRetryCachedReview =
    cached?.classification === "needs_ai_review" && Boolean(input.ai);

  if (cached && !canRetryCachedReview) {
    input.stats.cacheHits += 1;
    const tier = cached.classification_tier === 3 ? 3 : cached.classification_tier === 2 ? 2 : 1;
    return {
      footnoteHash,
      citationMatched: cached.citation_matched,
      classification: cached.classification,
      planAdoptionDate:
        cached.requires_date_extraction ? extractPlanAdoptionDate(input.footnoteText) : null,
      tier,
      needsAiReview: cached.classification === "needs_ai_review" || cached.classification === "unclassified",
      aiModelUsed: cached.ai_model_used,
      aiClassificationText: cached.ai_classification_text,
    };
  }

  input.stats.cacheMisses += 1;
  const citations = loadFootnoteCitations();
  const matched = matchFootnoteCitation(input.footnoteText, citations);
  const suggestedClassification =
    matched?.classification ?? codeDefaultClassification(input.transactionCode);

  if (matched && input.transactionCode !== "J" && citationIsAuthoritative(matched)) {
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

  if (input.ai) {
    return classifyWithAiAndPersist({
      footnoteHash,
      footnoteText: input.footnoteText,
      transactionCode: input.transactionCode,
      ai: input.ai,
      suggestedClassification,
      stats: input.stats,
    });
  }

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

  const codeFallback = codeDefaultClassification(input.transactionCode);
  if (codeFallback) {
    return {
      footnoteHash,
      citationMatched: null,
      classification: codeFallback,
      planAdoptionDate: null,
      tier: 1,
      needsAiReview: false,
      aiModelUsed: null,
      aiClassificationText: null,
    };
  }

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

export async function classifyOwnershipRows(
  parsed: ParsedOwnershipFiling,
  options: { ai?: AiClient } = {},
): Promise<{ rows: ClassifiedTransactionRow[]; stats: ClassifyStats }> {
  const stats: ClassifyStats = { tier3Calls: 0, cacheHits: 0, cacheMisses: 0 };
  const ai = options.ai ?? createForm345AiClient();

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
