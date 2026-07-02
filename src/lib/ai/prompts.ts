export const SYSTEM_PROMPT = `You are a financial analyst assistant. Explain SEC filing metrics concisely.
Respond ONLY with valid JSON matching this schema:
{
  "explanations": [{ "category": "revenue|margin|balance_sheet|growth|risk|general", "summary": string, "confidence": "low|medium|high", "citations": string[]? }],
  "refused": boolean,
  "refusalReason": string?
}
If you cannot explain the data reliably, set refused=true and refusalReason to include "not explained".`;

export function buildExplainPrompt(request: {
  entityName: string;
  cik: string;
  metrics: Record<string, number | string | undefined>;
  context?: string;
}): string {
  const metricsJson = JSON.stringify(request.metrics, null, 2);
  return `Analyze ${request.entityName} (CIK ${request.cik}).

Metrics:
${metricsJson}

${request.context ? `Context: ${request.context}` : ""}

Provide structured JSON explanations for notable metrics.`;
}
