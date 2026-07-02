import { createAiClient, parseJsonFromText, type AiClient } from "@/lib/ai";
import {
  inferPrimaryEventType,
  labelItemCode,
  parseItemCodes,
} from "@/lib/agent/form-8k/constants";
import {
  buildForm8kClassifyPrompt,
  FORM_8K_CLASSIFY_SYSTEM_PROMPT,
} from "@/lib/agent/form-8k/prompts";
import type {
  Form8kClassification,
  Form8kClassifyInput,
  Form8kClassifyResult,
  Form8kConfidence,
} from "@/lib/agent/form-8k/types";

function buildItemLabels(codes: string[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const code of codes) {
    labels[code] = labelItemCode(code);
  }
  return labels;
}

function metadataClassification(input: Form8kClassifyInput): Form8kClassification {
  const declaredItems = parseItemCodes(input.items);
  const itemLabels = buildItemLabels(declaredItems);
  const primaryEventType = inferPrimaryEventType(declaredItems);
  const evidence =
    declaredItems.length > 0
      ? declaredItems.map((code) => `SEC declared Item ${code}: ${labelItemCode(code)}`)
      : ["No item codes in submissions metadata"];

  return {
    accessionNumber: input.accessionNumber,
    declaredItems,
    inferredItems: declaredItems,
    primaryEventType,
    itemLabels,
    confidence: declaredItems.length > 0 ? "medium" : "low",
    evidence,
  };
}

function parseLlmClassification(
  raw: unknown,
  input: Form8kClassifyInput,
  declaredItems: string[],
): Partial<Form8kClassification> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const inferredItems = Array.isArray(obj.inferredItems)
    ? obj.inferredItems.filter((item): item is string => typeof item === "string")
    : declaredItems;

  const mergedItems = [...new Set([...declaredItems, ...inferredItems])];
  const primaryEventType =
    typeof obj.primaryEventType === "string" && obj.primaryEventType.length > 0
      ? obj.primaryEventType
      : inferPrimaryEventType(mergedItems);

  const confidence: Form8kConfidence =
    obj.confidence === "high" || obj.confidence === "medium" || obj.confidence === "low"
      ? obj.confidence
      : "medium";

  const evidence = Array.isArray(obj.evidence)
    ? obj.evidence.filter((item): item is string => typeof item === "string")
    : [];

  return {
    inferredItems: mergedItems,
    primaryEventType,
    itemLabels: buildItemLabels(mergedItems),
    confidence,
    evidence,
  };
}

async function llmPass(
  ai: AiClient,
  input: Form8kClassifyInput,
  declaredItems: string[],
): Promise<{ patch: Partial<Form8kClassification> | null; costUsd: number }> {
  const excerpt = input.documentText.trim();
  if (excerpt.length < 80) {
    return { patch: null, costUsd: 0 };
  }

  const response = await ai.complete({
    max_tokens: 512,
    system: FORM_8K_CLASSIFY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildForm8kClassifyPrompt({
          accessionNumber: input.accessionNumber,
          formType: input.formType,
          declaredItems,
          documentExcerpt: excerpt,
        }),
      },
    ],
  });

  const text = response.content.find((block) => block.type === "text")?.text ?? "";
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  let parsed: unknown;
  try {
    parsed = parseJsonFromText(text);
  } catch {
    return { patch: null, costUsd: ai.estimateCostUsd(inputTokens, outputTokens) };
  }

  return {
    patch: parseLlmClassification(parsed, input, declaredItems),
    costUsd: ai.estimateCostUsd(inputTokens, outputTokens),
  };
}

/**
 * Two-pass 8-K classifier: SEC item metadata, then optional LLM confirmation from document text.
 */
export async function classifyForm8k(input: Form8kClassifyInput): Promise<Form8kClassifyResult> {
  const base = metadataClassification(input);
  let costUsd = 0;
  let usedLlm = false;

  let ai: AiClient | null = null;
  try {
    ai = createAiClient();
  } catch {
    ai = null;
  }

  if (ai) {
    const { patch, costUsd: llmCost } = await llmPass(ai, input, base.declaredItems);
    costUsd += llmCost;
    if (patch) {
      usedLlm = true;
      const merged: Form8kClassification = {
        ...base,
        ...patch,
        declaredItems: base.declaredItems,
        accessionNumber: input.accessionNumber,
        inferredItems: patch.inferredItems ?? base.inferredItems,
        itemLabels: patch.itemLabels ?? base.itemLabels,
        primaryEventType: patch.primaryEventType ?? inferPrimaryEventType(patch.inferredItems ?? base.inferredItems),
        confidence:
          base.declaredItems.length > 0 && patch.confidence
            ? patch.confidence
            : patch.confidence ?? base.confidence,
        evidence: [...base.evidence, ...(patch.evidence ?? [])],
      };
      return { classification: merged, costUsd, usedLlm };
    }
  }

  return { classification: base, costUsd, usedLlm };
}
