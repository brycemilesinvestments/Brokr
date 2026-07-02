import type { AiClient } from "@/lib/ai/client";
import { buildExplainPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { ExplainRequest, ExplainResponse } from "@/lib/ai/types";
import { isRefusalResponse, parseJsonFromText, validateExplainResponse } from "@/lib/ai/validate";

export async function explainFinancials(
  client: AiClient,
  request: ExplainRequest,
): Promise<ExplainResponse> {
  const prompt = buildExplainPrompt(request);
  const response = await client.complete({
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((c) => c.type === "text")?.text ?? "";
  const parsed = parseJsonFromText(text);
  const validated = validateExplainResponse(parsed);

  if (!validated.ok) {
    return {
      explanations: [],
      refused: true,
      refusalReason: `Validation failed: ${validated.errors.join("; ")} — not explained`,
    };
  }

  if (isRefusalResponse(validated.data)) {
    return validated.data;
  }

  return validated.data;
}

export { isRefusalResponse };
