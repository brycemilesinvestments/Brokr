import {
  CONFIDENCE_LEVELS,
  EXPLANATION_CATEGORIES,
  REFUSAL_PHRASE,
  type ExplainResponse,
  type FinancialExplanation,
  type ValidationResult,
} from "@/lib/ai/types";

function isExplanationCategory(value: unknown): value is FinancialExplanation["category"] {
  return typeof value === "string" && EXPLANATION_CATEGORIES.includes(value as FinancialExplanation["category"]);
}

function isConfidence(value: unknown): value is FinancialExplanation["confidence"] {
  return typeof value === "string" && CONFIDENCE_LEVELS.includes(value as FinancialExplanation["confidence"]);
}

export function validateExplainResponse(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Response must be an object"] };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.refused !== "boolean") {
    errors.push("refused must be boolean");
  }

  if (obj.refusalReason !== undefined && typeof obj.refusalReason !== "string") {
    errors.push("refusalReason must be string");
  }

  if (!Array.isArray(obj.explanations)) {
    errors.push("explanations must be an array");
    return { ok: false, errors };
  }

  const explanations: FinancialExplanation[] = [];

  for (const [i, item] of obj.explanations.entries()) {
    if (!item || typeof item !== "object") {
      errors.push(`explanations[${i}] must be object`);
      continue;
    }

    const exp = item as Record<string, unknown>;
    if (!isExplanationCategory(exp.category)) {
      errors.push(`explanations[${i}].category invalid`);
    }
    if (typeof exp.summary !== "string" || exp.summary.length === 0) {
      errors.push(`explanations[${i}].summary must be non-empty string`);
    }
    if (!isConfidence(exp.confidence)) {
      errors.push(`explanations[${i}].confidence invalid`);
    }

    if (errors.length === 0 || errors.every((e) => !e.startsWith(`explanations[${i}]`))) {
      explanations.push({
        category: exp.category as FinancialExplanation["category"],
        summary: exp.summary as string,
        confidence: exp.confidence as FinancialExplanation["confidence"],
        citations: Array.isArray(exp.citations)
          ? exp.citations.filter((c): c is string => typeof c === "string")
          : undefined,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const response: ExplainResponse = {
    explanations,
    refused: obj.refused as boolean,
    refusalReason: obj.refusalReason as string | undefined,
  };

  return { ok: true, data: response };
}

export function isRefusalResponse(response: ExplainResponse): boolean {
  if (response.refused) return true;
  const reason = response.refusalReason?.toLowerCase() ?? "";
  return reason.includes(REFUSAL_PHRASE);
}

export function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
}
