import type { AiClient } from "@/lib/ai/client";
import { parseJsonFromText } from "@/lib/ai/validate";
import {
  buildUserPrompt,
  parseSectionResponse,
  SECTION_PROMPTS,
  SYSTEM_PROMPT,
} from "@/lib/ai/qualitative-prompts";
import type { ProseSection, ProseSections } from "@/lib/edgar/discovery";
import type {
  QualitativeSignals,
  SectionQualitativeSignal,
} from "@/lib/ai/qualitative-types";

export type ExtractProseSignalsResult = {
  signals: QualitativeSignals;
  costUsd: number;
};

function sectionsWithText(proseSections: ProseSections): ProseSection[] {
  return Object.values(proseSections).filter(
    (s): s is ProseSection => s !== null && s.text.length > 0,
  );
}

/** A2 — Convert located prose sections to structured signals (one bounded call per section). */
export async function extractProseSignals(
  client: AiClient,
  accessionNumber: string,
  proseSections: ProseSections,
): Promise<ExtractProseSignalsResult> {
  const sections = sectionsWithText(proseSections);
  const extracted: SectionQualitativeSignal[] = [];
  let costUsd = 0;

  const results = await Promise.all(
    sections.map(async (section) => {
      const config = SECTION_PROMPTS[section.key];
      const response = await client.complete({
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(section, config) }],
      });

      const text = response.content.find((c) => c.type === "text")?.text ?? "";
      let parsed: unknown;
      try {
        parsed = parseJsonFromText(text);
      } catch {
        return { signal: { section: section.key } as SectionQualitativeSignal, costUsd: 0 };
      }

      const signal = parseSectionResponse(section.key, parsed, config);
      const sectionCost = response.usage
        ? client.estimateCostUsd(response.usage.input_tokens, response.usage.output_tokens)
        : 0;
      return { signal, costUsd: sectionCost };
    }),
  );

  for (const { signal, costUsd: sectionCost } of results) {
    extracted.push(signal);
    costUsd += sectionCost;
  }

  return {
    signals: {
      accessionNumber,
      extractedAt: new Date().toISOString(),
      sections: extracted,
    },
    costUsd,
  };
}
