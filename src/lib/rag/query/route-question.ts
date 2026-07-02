import {
  METRIC_ALIASES,
  NUMERIC_KEYWORDS,
  QUALITATIVE_KEYWORDS,
} from "@/lib/rag/constants";
import type { QuestionRoute } from "@/lib/rag/types";

/** Q1 — Classify question as numeric | qualitative | mixed (deterministic). */
export function routeQuestion(question: string): QuestionRoute {
  const lower = question.toLowerCase();

  const hasNumeric = NUMERIC_KEYWORDS.some((kw) => lower.includes(kw));
  const hasQualitative = QUALITATIVE_KEYWORDS.some((kw) => lower.includes(kw));

  if (hasNumeric && hasQualitative) return "mixed";
  if (hasNumeric) return "numeric";
  if (hasQualitative) return "qualitative";
  return "mixed";
}

export function extractMetricHints(question: string): string[] {
  const lower = question.toLowerCase();
  const hints = new Set<string>();

  for (const [alias, concept] of Object.entries(METRIC_ALIASES)) {
    if (lower.includes(alias)) hints.add(concept);
  }

  if (lower.includes("q1")) hints.add("fp:Q1");
  if (lower.includes("q2")) hints.add("fp:Q2");
  if (lower.includes("q3")) hints.add("fp:Q3");
  if (lower.includes("q4")) hints.add("fp:Q4");

  return [...hints];
}

export function extractFpHint(question: string): string | null {
  const match = question.toLowerCase().match(/\bq([1-4])\b/);
  return match ? `Q${match[1]}` : null;
}
