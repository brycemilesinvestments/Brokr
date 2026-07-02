export { AiClient, createAiClient } from "@/lib/ai/client";
export type { AiClientOptions } from "@/lib/ai/client";

export { explainFinancials, isRefusalResponse } from "@/lib/ai/explain";
export { extractProseSignals } from "@/lib/ai/qualitative-signals";
export { buildExplainPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
export {
  validateExplainResponse,
  parseJsonFromText,
} from "@/lib/ai/validate";

export {
  HAIKU_MODEL,
  REFUSAL_PHRASE,
  EXPLANATION_CATEGORIES,
  CONFIDENCE_LEVELS,
} from "@/lib/ai/types";

export type {
  ExplanationCategory,
  ExplanationConfidence,
  FinancialExplanation,
  ExplainRequest,
  ExplainResponse,
  ClaudeMessage,
  ClaudeRequest,
  ClaudeResponse,
  ValidationResult,
} from "@/lib/ai/types";

export type {
  OutlookSignal,
  CustomerSignal,
  GuidanceSignal,
  GuidanceRange,
  SectionQualitativeSignal,
  QualitativeSignals,
  QualitativeSignalsResult,
} from "@/lib/ai/qualitative-types";

export { CONCENTRATION_TOLERANCE_PCT } from "@/lib/ai/qualitative-types";
