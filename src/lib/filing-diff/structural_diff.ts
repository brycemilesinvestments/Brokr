import type { ProseSections } from "@/lib/edgar/discovery";
import type {
  StructuralDiffResult,
  StructuralSnapshot,
} from "@/lib/filing-diff/types";

type BuildStructuralSnapshotInput = {
  proseSections?: ProseSections;
  riskTags?: string[];
  hasRevenueConcentration?: boolean;
  hasGuidance?: boolean;
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
      }),
    ),
  ).sort();
}

/** F3 — Build deterministic structural snapshot from filing metadata/prose presence. */
export function buildStructuralSnapshot(input: BuildStructuralSnapshotInput): StructuralSnapshot {
  const prose = input.proseSections;
  return {
    hasMda: Boolean(prose?.mda?.text?.length),
    hasRiskFactors: Boolean(prose?.risk_factors?.text?.length),
    hasRevenueConcentration:
      input.hasRevenueConcentration ?? Boolean(prose?.revenue_concentration?.text?.length),
    hasGuidance: input.hasGuidance ?? Boolean(prose?.subsequent_events?.text?.length),
    riskTags: uniqueSorted(input.riskTags ?? []),
  };
}

/** F3 — Compare structural snapshots without AI usage. */
export function computeStructuralDiff(
  current: StructuralSnapshot,
  previous: StructuralSnapshot,
): StructuralDiffResult {
  const changedFields: StructuralDiffResult["changedFields"] = [];
  if (current.hasMda !== previous.hasMda) changedFields.push("hasMda");
  if (current.hasRiskFactors !== previous.hasRiskFactors) changedFields.push("hasRiskFactors");
  if (current.hasRevenueConcentration !== previous.hasRevenueConcentration) {
    changedFields.push("hasRevenueConcentration");
  }
  if (current.hasGuidance !== previous.hasGuidance) changedFields.push("hasGuidance");

  const currentTags = new Set(current.riskTags);
  const previousTags = new Set(previous.riskTags);
  const addedRiskTags = current.riskTags.filter((tag) => !previousTags.has(tag));
  const removedRiskTags = previous.riskTags.filter((tag) => !currentTags.has(tag));
  if (addedRiskTags.length > 0 || removedRiskTags.length > 0) {
    changedFields.push("riskTags");
  }

  return {
    changed: changedFields.length > 0,
    changedFields,
    current,
    previous,
    addedRiskTags,
    removedRiskTags,
  };
}
