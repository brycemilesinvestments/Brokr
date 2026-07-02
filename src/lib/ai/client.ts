import { HAIKU_MODEL, type ClaudeRequest, type ClaudeResponse } from "@/lib/ai/types";

export type AiClientOptions = {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
  baseUrl?: string;
};

export class AiClient {
  private apiKey: string;
  private model: string;
  private fetchFn: typeof fetch;
  private baseUrl: string;

  constructor(options: AiClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.CLAUDE_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("CLAUDE_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.model = options.model ?? HAIKU_MODEL;
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com/v1/messages";
  }

  getModel(): string {
    return this.model;
  }

  async complete(request: Omit<ClaudeRequest, "model">): Promise<ClaudeResponse> {
    const response = await this.fetchFn(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        ...request,
      } satisfies ClaudeRequest),
    });

    if (!response.ok) {
      throw new Error(`Claude API error (${response.status})`);
    }

    return response.json() as Promise<ClaudeResponse>;
  }

  estimateCostUsd(inputTokens: number, outputTokens: number): number {
    const inputRate = 0.8 / 1_000_000;
    const outputRate = 4.0 / 1_000_000;
    return inputTokens * inputRate + outputTokens * outputRate;
  }
}

export function createAiClient(options?: AiClientOptions): AiClient {
  return new AiClient(options);
}
