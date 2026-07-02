import { describe, expect, it } from "vitest";
import {
  validateExplainResponse,
  parseJsonFromText,
  isRefusalResponse,
  HAIKU_MODEL,
  EXPLANATION_CATEGORIES,
  CONFIDENCE_LEVELS,
} from "@/lib/ai";
import { AiClient } from "@/lib/ai/client";

describe("AI chunk", () => {
  it("uses Haiku model slug", () => {
    const client = new AiClient({ apiKey: "test-key" });
    expect(client.getModel()).toBe(HAIKU_MODEL);
    expect(HAIKU_MODEL).toContain("haiku");
  });

  it("validates structured explain response", () => {
    const result = validateExplainResponse({
      refused: false,
      explanations: [
        {
          category: "revenue",
          summary: "Revenue grew significantly YoY.",
          confidence: "high",
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("validates enum categories and confidence", () => {
    expect(EXPLANATION_CATEGORIES).toContain("margin");
    expect(CONFIDENCE_LEVELS).toEqual(["low", "medium", "high"]);
  });

  it("detects refusal with 'not explained'", () => {
    const response = {
      explanations: [],
      refused: true,
      refusalReason: "Insufficient data — not explained",
    };
    expect(isRefusalResponse(response)).toBe(true);
  });

  it("rejects bad JSON structure", () => {
    const result = validateExplainResponse({ refused: "no" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid confidence enum", () => {
    const result = validateExplainResponse({
      refused: false,
      explanations: [{ category: "revenue", summary: "x", confidence: "invalid" }],
    });
    expect(result.ok).toBe(false);
  });

  it("parses JSON from fenced code block", () => {
    const parsed = parseJsonFromText('```json\n{"refused": false, "explanations": []}\n```');
    expect(parsed).toEqual({ refused: false, explanations: [] });
  });
});
