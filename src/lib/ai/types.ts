export type ExplanationCategory =
  | "revenue"
  | "margin"
  | "balance_sheet"
  | "growth"
  | "risk"
  | "general";

export type ExplanationConfidence = "low" | "medium" | "high";

export type FinancialExplanation = {
  category: ExplanationCategory;
  summary: string;
  confidence: ExplanationConfidence;
  citations?: string[];
};

export type ExplainRequest = {
  entityName: string;
  cik: string;
  metrics: Record<string, number | string | undefined>;
  context?: string;
};

export type ExplainResponse = {
  explanations: FinancialExplanation[];
  refused: boolean;
  refusalReason?: string;
};

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ClaudeRequest = {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
};

export type ClaudeResponse = {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
};

export type ValidationResult =
  | { ok: true; data: ExplainResponse }
  | { ok: false; errors: string[] };

export const HAIKU_MODEL = "claude-haiku-4-5";

export const EXPLANATION_CATEGORIES: ExplanationCategory[] = [
  "revenue",
  "margin",
  "balance_sheet",
  "growth",
  "risk",
  "general",
];

export const CONFIDENCE_LEVELS: ExplanationConfidence[] = ["low", "medium", "high"];

export const REFUSAL_PHRASE = "not explained";
