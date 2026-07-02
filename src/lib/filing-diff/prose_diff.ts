import type { ProseSections } from "@/lib/edgar/discovery";
import type {
  ProseDiffModel,
  ProseDiffResult,
  ProseDiffSection,
  ProseSectionKey,
  ScopedProseSection,
} from "@/lib/filing-diff/types";

const TARGET_SECTIONS: ProseSectionKey[] = ["mda", "risk_factors"];
const DEFAULT_PROSE_SECTION_CHAR_LIMIT = 12_000;

function trimToLimit(value: string, limit: number): string {
  return value.length <= limit ? value : value.slice(0, limit);
}

function scopedSections(
  current: ProseSections,
  previous: ProseSections,
  charLimit: number,
): ScopedProseSection[] {
  return TARGET_SECTIONS.flatMap((key) => {
    const currentText = current[key]?.text?.trim() ?? "";
    const previousText = previous[key]?.text?.trim() ?? "";
    if (!currentText && !previousText) return [];
    return [
      {
        key,
        currentText: trimToLimit(currentText, charLimit),
        previousText: trimToLimit(previousText, charLimit),
      },
    ];
  });
}

function defaultSectionsResult(
  sections: ScopedProseSection[],
  changed = false,
): ProseDiffSection[] {
  return sections.map((s) => ({ key: s.key, changed }));
}

function normalizeModelResult(
  sections: ScopedProseSection[],
  response: Partial<ProseDiffResult> | null | undefined,
): ProseDiffResult {
  if (!response || response.refusal === true) {
    return {
      changed: false,
      sections: defaultSectionsResult(sections, false),
      refusal: true,
      costUsd: 0,
      model: response?.model,
    };
  }

  const sectionMap = new Map(
    (response.sections ?? [])
      .filter((s): s is ProseDiffSection => s.key === "mda" || s.key === "risk_factors")
      .map((s) => [s.key, s]),
  );

  return {
    changed: response.changed === true,
    sections: sections.map((s) => sectionMap.get(s.key) ?? { key: s.key, changed: false }),
    refusal: false,
    costUsd: typeof response.costUsd === "number" ? response.costUsd : 0,
    model: response.model,
  };
}

export type DiffProseInput = {
  current: ProseSections;
  previous: ProseSections;
  aiModel: ProseDiffModel;
  proseSectionCharLimit?: number;
};

/** F5 — AI prose diff on scoped sections only (MD&A + risk factors). */
export async function diffProse(input: DiffProseInput): Promise<ProseDiffResult> {
  const limit = input.proseSectionCharLimit ?? DEFAULT_PROSE_SECTION_CHAR_LIMIT;
  const sections = scopedSections(input.current, input.previous, limit);
  if (sections.length === 0) {
    return {
      changed: false,
      sections: [],
      refusal: false,
      costUsd: 0,
    };
  }

  try {
    const response = await input.aiModel({ sections });
    return normalizeModelResult(sections, response);
  } catch {
    return {
      changed: false,
      sections: defaultSectionsResult(sections, false),
      refusal: true,
      costUsd: 0,
    };
  }
}

export { DEFAULT_PROSE_SECTION_CHAR_LIMIT };
