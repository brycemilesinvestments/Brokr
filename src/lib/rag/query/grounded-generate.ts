import type { AiClient } from "@/lib/ai/client";
import { parseJsonFromText } from "@/lib/ai/validate";
import { NOT_DISCLOSED_PHRASE } from "@/lib/rag/constants";
import { contextToPrompt } from "@/lib/rag/query/build-context";
import type { Citation, GroundedAnswer, QuestionRoute, RagContext } from "@/lib/rag/types";

const SYSTEM_PROMPT = `You are a SEC filing analyst. Answer ONLY from the provided context.

Hard rules:
1. Every numeric claim MUST use a value from STRUCTURED METRICS. Never invent or estimate numbers. Never read numbers from FILING PROSE.
2. Every narrative claim MUST cite the filing using [accession:...|period:...|section:...] tags from the prose chunks.
3. If the context does not support a claim, say exactly: "${NOT_DISCLOSED_PHRASE}" for that claim.
4. Do not use outside knowledge presented as filing fact. No fabrication.

Respond with JSON:
{
  "answer": "markdown answer with inline citation tags",
  "citations": [{"accession":"...","periodEnd":"...","sectionType":"...","claim":"..."}],
  "refused": false
}`;

type GenerateResponse = {
  answer: string;
  citations: Citation[];
  refused: boolean;
};

/** Q4 — Grounded answer generation with numeric + citation guardrails. */
export async function groundedGenerate(
  client: AiClient,
  input: {
    question: string;
    context: RagContext;
    route: QuestionRoute;
    metricsUsed: RagContext["metrics"];
  },
): Promise<Pick<GroundedAnswer, "answer" | "citations" | "refused" | "costUsd">> {
  const contextBlock = contextToPrompt(input.context, input.route);

  const response = await client.complete({
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${contextBlock}\n\nQuestion: ${input.question}\n\nRemember: numbers only from STRUCTURED METRICS.`,
      },
    ],
  });

  const text = response.content.find((c) => c.type === "text")?.text ?? "";
  let parsed: GenerateResponse;

  try {
    parsed = parseJsonFromText(text) as GenerateResponse;
  } catch {
    return {
      answer: NOT_DISCLOSED_PHRASE,
      citations: [],
      refused: true,
      costUsd: response.usage
        ? client.estimateCostUsd(response.usage.input_tokens, response.usage.output_tokens)
        : 0,
    };
  }

  const costUsd = response.usage
    ? client.estimateCostUsd(response.usage.input_tokens, response.usage.output_tokens)
    : 0;

  if (input.route === "numeric" && input.metricsUsed.length === 0) {
    return {
      answer: NOT_DISCLOSED_PHRASE,
      citations: [],
      refused: true,
      costUsd,
    };
  }

  const answer = parsed.answer ?? NOT_DISCLOSED_PHRASE;
  const refused =
    parsed.refused ||
    answer.toLowerCase().includes(NOT_DISCLOSED_PHRASE) ||
    (input.route !== "numeric" && !parsed.citations?.length && input.context.chunks.length === 0);

  return {
    answer,
    citations: parsed.citations ?? [],
    refused,
    costUsd,
  };
}

export function buildPromptForInspection(context: RagContext, route: QuestionRoute, question: string): string {
  return `${contextToPrompt(context, route)}\n\nQuestion: ${question}`;
}
