import { describe, expect, it, vi } from "vitest";
import type { ProseSections } from "@/lib/edgar/discovery";
import type { FilingRef } from "@/lib/edgar/types";
import {
  buildFilingDiffCacheKey,
  buildStructuralSnapshot,
  checkDiffCache,
  computeNumericDiff,
  computeStructuralDiff,
  diffProse,
  pairFilings,
  rankSeverity,
  routeFilingDiffAction,
  runFilingDiffRouter,
  writeDiffCache,
  type FilingDiffCache,
  type FilingDiffState,
  type ProseDiffResult,
} from "@/lib/filing-diff";

const PAIRED_FILINGS: FilingRef[] = [
  {
    cik: "0002023554",
    accessionNumber: "0001628280-26-029401",
    form: "10-Q",
    filingDate: "2026-05-01",
    reportDate: "2026-04-03",
  },
  {
    cik: "0002023554",
    accessionNumber: "0001628280-25-050698",
    form: "10-Q",
    filingDate: "2025-05-02",
    reportDate: "2025-04-04",
  },
  {
    cik: "0002023554",
    accessionNumber: "0002023554-25-000034",
    form: "10-K",
    filingDate: "2025-08-14",
    reportDate: "2025-06-27",
  },
  {
    cik: "0002023554",
    accessionNumber: "0002023554-24-000021",
    form: "10-K",
    filingDate: "2024-08-12",
    reportDate: "2024-06-28",
  },
  {
    cik: "0002023554",
    accessionNumber: "0001363249-26-000054",
    form: "4",
    filingDate: "2026-06-22",
  },
];

function prose(text: string): ProseSections {
  return {
    mda: {
      key: "mda",
      concept: "ManagementDiscussionAndAnalysisTextBlock",
      taxonomy: "us-gaap",
      text,
      charCount: text.length,
    },
    risk_factors: {
      key: "risk_factors",
      concept: "RiskFactorsTextBlock",
      taxonomy: "us-gaap",
      text,
      charCount: text.length,
    },
    revenue_concentration: null,
    subsequent_events: null,
    form_8k_body: null,
    exhibit_99_1: null,
  };
}

describe("pairFilings (F1)", () => {
  it("pairs 10-Q with prior-year same quarter filing", () => {
    const pair = pairFilings("0002023554", PAIRED_FILINGS, "0001628280-26-029401");
    expect(pair).toBeTruthy();
    expect(pair?.form).toBe("10-Q");
    expect(pair?.previous.accessionNumber).toBe("0001628280-25-050698");
  });

  it("pairs 10-K with prior 10-K", () => {
    const pair = pairFilings("0002023554", PAIRED_FILINGS, "0002023554-25-000034");
    expect(pair).toBeTruthy();
    expect(pair?.form).toBe("10-K");
    expect(pair?.previous.accessionNumber).toBe("0002023554-24-000021");
  });
});

describe("computeNumericDiff (F2)", () => {
  it("computes deterministic deltas and changed counts", () => {
    const result = computeNumericDiff(
      { revenue: 5950000000, grossMargin: 0.42, eps: 1.01 },
      { revenue: 4900000000, grossMargin: 0.38, eps: 1.01 },
    );
    expect(result.changedCount).toBe(2);
    expect(result.items.find((i) => i.metric === "revenue")?.delta).toBe(1050000000);
    expect(result.items.find((i) => i.metric === "eps")?.changed).toBe(false);
  });
});

describe("computeStructuralDiff (F3)", () => {
  it("detects section/risk tag/concentration/guidance structural changes", () => {
    const current = buildStructuralSnapshot({
      proseSections: {
        ...prose("new text"),
        revenue_concentration: {
          key: "revenue_concentration",
          concept: "RevenueConcentrationTextBlock",
          taxonomy: "us-gaap",
          text: "Top customer represented 18%.",
          charCount: 31,
        },
        subsequent_events: {
          key: "subsequent_events",
          concept: "SubsequentEventsTextBlock",
          taxonomy: "us-gaap",
          text: "We issued guidance.",
          charCount: 19,
        },
      },
      riskTags: ["pricing", "competition"],
    });
    const previous = buildStructuralSnapshot({
      proseSections: prose("old text"),
      riskTags: ["competition"],
    });
    const diff = computeStructuralDiff(current, previous);
    expect(diff.changed).toBe(true);
    expect(diff.changedFields).toContain("hasRevenueConcentration");
    expect(diff.changedFields).toContain("hasGuidance");
    expect(diff.addedRiskTags).toEqual(["pricing"]);
  });
});

describe("cache helpers (F4, F6)", () => {
  it("checks and writes cache by accession-pair key", async () => {
    const store = new Map<string, ProseDiffResult>();
    const cache: FilingDiffCache = {
      async read(key) {
        return store.get(buildFilingDiffCacheKey(key)) ?? null;
      },
      async write(key, value) {
        store.set(buildFilingDiffCacheKey(key), value);
      },
    };
    const key = {
      cik: "0002023554",
      currentAccession: "0001628280-26-029401",
      previousAccession: "0001628280-25-050698",
    };
    const checkMiss = await checkDiffCache(cache, key);
    expect(checkMiss.hit).toBe(false);

    await writeDiffCache(cache, key, {
      changed: false,
      sections: [{ key: "mda", changed: false }],
      refusal: false,
      costUsd: 0,
    });
    const checkHit = await checkDiffCache(cache, key);
    expect(checkHit.hit).toBe(true);
    expect(checkHit.prose?.sections[0].key).toBe("mda");
  });
});

describe("diffProse (F5)", () => {
  it("sends only MD&A/risk sections and obeys token ceiling", async () => {
    const ai = vi.fn(async ({ sections }: { sections: Array<{ key: string; currentText: string }> }) => {
      expect(sections).toHaveLength(2);
      expect(sections.every((s) => s.key === "mda" || s.key === "risk_factors")).toBe(true);
      expect(sections[0].currentText.length).toBeLessThanOrEqual(100);
      expect(sections[1].currentText.length).toBeLessThanOrEqual(100);
      return {
        changed: true,
        sections: [
          { key: "mda" as const, changed: true, summary: "Guidance language tightened." },
          { key: "risk_factors" as const, changed: false },
        ],
        refusal: false,
        costUsd: 0.02,
      };
    });
    const longText = "A".repeat(500);
    const result = await diffProse({
      current: prose(longText),
      previous: prose(longText),
      aiModel: ai,
      proseSectionCharLimit: 100,
    });
    expect(ai).toHaveBeenCalledTimes(1);
    expect(result.changed).toBe(true);
    expect(result.sections).toHaveLength(2);
  });

  it("returns changed=false on refusal/AI failure", async () => {
    const refusal = await diffProse({
      current: prose("same"),
      previous: prose("same"),
      aiModel: async () => ({ refusal: true }),
    });
    expect(refusal.changed).toBe(false);
    expect(refusal.refusal).toBe(true);
  });
});

describe("rankSeverity (F7)", () => {
  it("ranks high severity when numeric+structural+prose all change", () => {
    const severity = rankSeverity({
      numeric: computeNumericDiff({ revenue: 20, eps: 5 }, { revenue: 10, eps: 3 }),
      structural: computeStructuralDiff(
        buildStructuralSnapshot({ proseSections: prose("new"), riskTags: ["credit"] }),
        buildStructuralSnapshot({ proseSections: prose("old"), riskTags: [] }),
      ),
      prose: {
        changed: true,
        sections: [{ key: "mda", changed: true }],
        refusal: false,
        costUsd: 0.01,
      },
    });
    expect(severity.level).toBe("high");
    expect(severity.score).toBeGreaterThanOrEqual(5);
  });
});

describe("routeFilingDiffAction", () => {
  it("routes through required steps in order", () => {
    const base: FilingDiffState = {
      cik: "1",
      accessionNumber: "a",
      filings: [],
      iteration: 0,
      completed: false,
      pair: null,
      numeric: null,
      structural: null,
      cacheHit: false,
      prose: null,
      severity: null,
      actionsTaken: [],
      errors: [],
    };
    expect(routeFilingDiffAction(base)).toBe("pair_filings");
    expect(routeFilingDiffAction({ ...base, pair: {} as never })).toBe("numeric_diff");
    expect(routeFilingDiffAction({ ...base, pair: {} as never, numeric: { items: [], changedCount: 0 } })).toBe(
      "structural_diff",
    );
  });
});

describe("runFilingDiffRouter integration", () => {
  it("cache hit path makes zero AI calls", async () => {
    const ai = vi.fn();
    const key = {
      cik: "0002023554",
      currentAccession: "0001628280-26-029401",
      previousAccession: "0001628280-25-050698",
    };
    const cache: FilingDiffCache = {
      async read(readKey) {
        if (buildFilingDiffCacheKey(readKey) === buildFilingDiffCacheKey(key)) {
          return {
            changed: false,
            sections: [{ key: "mda", changed: false }, { key: "risk_factors", changed: false }],
            refusal: false,
            costUsd: 0,
          };
        }
        return null;
      },
      async write() {},
    };
    const output = await runFilingDiffRouter({
      cik: "0002023554",
      accessionNumber: "0001628280-26-029401",
      filings: PAIRED_FILINGS,
      metricsByAccession: {
        "0001628280-26-029401": { revenue: 5950000000 },
        "0001628280-25-050698": { revenue: 5900000000 },
      },
      proseByAccession: {
        "0001628280-26-029401": prose("current"),
        "0001628280-25-050698": prose("previous"),
      },
      cache,
      aiDiff: ai,
    });
    expect(output.cacheHit).toBe(true);
    expect(ai).not.toHaveBeenCalled();
    expect(output.actionsTaken).not.toContain("prose_diff");
  });

  it("cache miss invokes AI and writes cache", async () => {
    const writeSpy = vi.fn();
    const cache: FilingDiffCache = {
      async read() {
        return null;
      },
      async write(key, value) {
        writeSpy(key, value);
      },
    };
    const ai = vi.fn(async () => ({
      changed: true,
      sections: [
        { key: "mda" as const, changed: true, summary: "Material demand shift." },
        { key: "risk_factors" as const, changed: false },
      ],
      refusal: false,
      costUsd: 0.03,
    }));

    const output = await runFilingDiffRouter({
      cik: "0002023554",
      accessionNumber: "0001628280-26-029401",
      filings: PAIRED_FILINGS,
      metricsByAccession: {
        "0001628280-26-029401": { revenue: 5950000000, grossMargin: 0.42 },
        "0001628280-25-050698": { revenue: 5900000000, grossMargin: 0.39 },
      },
      proseByAccession: {
        "0001628280-26-029401": prose("current prose"),
        "0001628280-25-050698": prose("prior prose"),
      },
      cache,
      aiDiff: ai,
    });

    expect(output.cacheHit).toBe(false);
    expect(ai).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(output.prose.changed).toBe(true);
  });
});
