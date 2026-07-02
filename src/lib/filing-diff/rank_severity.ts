import type {
  NumericDiffResult,
  ProseDiffResult,
  SeverityRanking,
  StructuralDiffResult,
} from "@/lib/filing-diff/types";

/** F7 — Rank filing diff severity from deterministic + prose signals. */
export function rankSeverity(input: {
  numeric: NumericDiffResult;
  structural: StructuralDiffResult;
  prose: ProseDiffResult;
}): SeverityRanking {
  let score = 0;
  const reasons: string[] = [];

  if (input.numeric.changedCount > 0) {
    const numericScore = Math.min(4, input.numeric.changedCount);
    score += numericScore;
    reasons.push(`${input.numeric.changedCount} numeric metric(s) changed`);
  }

  if (input.structural.changed) {
    const structuralWeight = input.structural.changedFields.includes("riskTags") ? 2 : 1;
    score += structuralWeight;
    reasons.push(`structural changes: ${input.structural.changedFields.join(", ")}`);
  }

  if (input.prose.changed) {
    score += 2;
    reasons.push("material prose change in scoped sections");
  }

  let level: SeverityRanking["level"] = "low";
  if (score >= 5) level = "high";
  else if (score >= 3) level = "medium";

  return { level, score, reasons };
}
