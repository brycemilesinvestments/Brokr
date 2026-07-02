import type { ProseSections } from "@/lib/edgar/discovery";
import { extractAuditorName } from "@/lib/edgar/discovery";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import type { AuditorChangeResult } from "@/lib/agent/form-10k";

/** K11 — Detect auditor name change year-over-year. */
export function detectAuditorChange(input: {
  currentFacts: XbrlFact[];
  currentSections: ProseSections;
  previousFacts?: XbrlFact[];
  previousSections?: ProseSections;
}): AuditorChangeResult {
  const currentAuditor = extractAuditorName(input.currentFacts, input.currentSections);
  const previousAuditor =
    input.previousFacts && input.previousSections
      ? extractAuditorName(input.previousFacts, input.previousSections)
      : null;

  const changed =
    currentAuditor !== null &&
    previousAuditor !== null &&
    currentAuditor.toLowerCase() !== previousAuditor.toLowerCase();

  return {
    currentAuditor,
    previousAuditor,
    changed,
    materialEvent: changed,
  };
}
