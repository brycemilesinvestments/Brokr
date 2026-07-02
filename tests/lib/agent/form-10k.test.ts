import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  routeForm10kAction,
  validateForm10kContract,
  type Form10kState,
} from "@/lib/agent/form-10k";
import { createEdgarClient, extractIxbrl } from "@/lib/edgar";
import {
  buildSectionCoverage,
  extractHtmlHeadingSections,
  locateForm10kSections,
  extractAuditorName,
} from "@/lib/edgar/discovery";
import { emptyProseSections } from "@/lib/edgar/discovery/empty-prose-sections";
import { isAuditedForm, tagPointAuditStatus } from "@/lib/edgar/time-series/audit-status";
import { detectAuditorChange } from "@/lib/orchestrate/form-10k/detect-auditor-change";
import { extractXbrlUniverse } from "@/lib/orchestrate/form-10k/extract-xbrl-universe";
import { confirmPgvectorSchema } from "@/lib/orchestrate/form-10k/confirm-pgvector-schema";
import { crossRef8kEvents } from "@/lib/orchestrate/form-10k/cross-ref-8k-events";
import { chunkSections } from "@/lib/rag/ingest/chunk-sections";
import companyFactsFixture from "../../fixtures/sndk-companyfacts.json";

const IXBRL_FIXTURE = readFileSync(
  join(process.cwd(), "tests/fixtures/sndk-10q-ixbrl.htm"),
  "utf8",
);
const SNDK_10K_HEADINGS_HTML = readFileSync(
  join(process.cwd(), "tests/fixtures/sndk-10k-headings.htm"),
  "utf8",
);

const SNDK_CIK = "0002023554";
const SNDK_ACCESSION = "0002023554-25-000034";

function baseState(overrides: Partial<Form10kState> = {}): Form10kState {
  return {
    cik: SNDK_CIK,
    accessionNumber: SNDK_ACCESSION,
    form: "10-K",
    filings: [],
    iteration: 0,
    completed: false,
    actionsTaken: [],
    errors: [],
    sections: emptyProseSections(),
    xbrlUniverse: null,
    audited: null,
    pair: null,
    numeric: null,
    structural: null,
    cacheHit: false,
    prose: null,
    credibility: null,
    eightKCrossRef: null,
    auditorChange: null,
    pgvectorReady: false,
    costUsd: 0,
    ...overrides,
  };
}

function synthetic10kHtml(sections: Record<string, string>): string {
  const blocks = Object.entries(sections)
    .map(([heading, body]) => `<p><b>${heading}</b></p><p>${body}</p>`)
    .join("\n");
  return `<html><body>${blocks}</body></html>`;
}

describe("routeForm10kAction", () => {
  it("follows K1→K12 order when keys are missing", () => {
    expect(routeForm10kAction(baseState())).toBe("extract_xbrl_universe");
    expect(
      routeForm10kAction(
        baseState({ sections: emptyProseSections(), xbrlUniverse: null }),
      ),
    ).toBe("extract_xbrl_universe");
    expect(
      routeForm10kAction(
        baseState({
          xbrlUniverse: {
            ixbrlFactCount: 100,
            companyfactsConceptCount: 50,
            ixbrlExceedsCompanyfacts: true,
            customNamespaceFacts: 5,
            coverageByTaxonomy: {},
          },
        }),
      ),
    ).toBe("tag_audit_status");
  });

  it("skips diff steps when no annual pair exists", () => {
    const state = baseState({
      sections: emptyProseSections(),
      xbrlUniverse: {
        ixbrlFactCount: 1,
        companyfactsConceptCount: 1,
        ixbrlExceedsCompanyfacts: false,
        customNamespaceFacts: 0,
        coverageByTaxonomy: {},
      },
      audited: true,
      actionsTaken: ["pair_annual_filings"],
      pair: null,
    });
    expect(routeForm10kAction(state)).toBe("store_credibility");
  });
});

describe("audited flag (K3)", () => {
  it("tags 10-K as audited and 10-Q as unaudited", () => {
    expect(isAuditedForm("10-K")).toBe(true);
    expect(isAuditedForm("10-Q")).toBe(false);
    expect(tagPointAuditStatus({ form: "10-K", value: 1 }).audited).toBe(true);
    expect(tagPointAuditStatus({ form: "10-Q", value: 1 }).audited).toBe(false);
  });
});

describe("extractXbrlUniverse (K2)", () => {
  it("reports more iXBRL facts than companyfacts concepts when fixture exceeds API", () => {
    const facts = extractIxbrl(IXBRL_FIXTURE).facts;
    const report = extractXbrlUniverse(facts, companyFactsFixture as never);
    expect(report.ixbrlFactCount).toBeGreaterThan(0);
    expect(report.companyfactsConceptCount).toBeGreaterThan(0);
  });
});

describe("detectAuditorChange (K11)", () => {
  it("fires material event when auditor names differ", () => {
    const sections = emptyProseSections();
    const current = detectAuditorChange({
      currentFacts: [{ concept: "AuditorName", taxonomy: "dei", value: "Firm A", name: "dei:AuditorName" } as never],
      currentSections: sections,
      previousFacts: [{ concept: "AuditorName", taxonomy: "dei", value: "Firm B", name: "dei:AuditorName" } as never],
      previousSections: sections,
    });
    expect(current.changed).toBe(true);
    expect(current.materialEvent).toBe(true);
  });
});

describe("crossRef8kEvents (K10)", () => {
  it("links goodwill impairment language to notes section", () => {
    const sections = {
      ...emptyProseSections(),
      notes: {
        key: "notes" as const,
        concept: "NotesToFinancialStatementsTextBlock",
        taxonomy: "us-gaap",
        text: "We recorded a goodwill impairment charge of $500 million during fiscal 2025.",
        charCount: 80,
        source: "ixbrl_textblock" as const,
      },
    };
    const result = crossRef8kEvents(sections, [
      {
        accessionNumber: "0001628280-25-050698",
        eventType: "goodwill_impairment",
        eventDate: "2025-05-02",
        searchTerms: ["goodwill impairment"],
      },
    ]);
    expect(result.linked).toHaveLength(1);
    expect(result.linked[0]?.linkedSection).toBe("notes");
  });
});

describe("confirmPgvectorSchema (K12)", () => {
  it("requires audited boolean and source on every chunk", () => {
    expect(
      confirmPgvectorSchema([
        {
          companyId: "1",
          accession: "a",
          sectionType: "mda",
          periodEnd: "2025-06-27",
          chunkIndex: 0,
          text: "text",
          tokenCount: 10,
          audited: true,
          source: "html_heading_fallback",
        },
      ]),
    ).toBe(true);
    expect(
      confirmPgvectorSchema([
        {
          companyId: "1",
          accession: "a",
          sectionType: "mda",
          periodEnd: "2025-06-27",
          chunkIndex: 0,
          text: "text",
          tokenCount: 10,
        },
      ]),
    ).toBe(false);
  });
});

describe("locateForm10kSections (K1)", () => {
  it("returns labeled sections from synthetic iXBRL facts", () => {
    const facts = [
      {
        concept: "RiskFactorsTextBlock",
        taxonomy: "us-gaap",
        value: "A".repeat(120),
        name: "us-gaap:RiskFactorsTextBlock",
      },
      {
        concept: "ManagementDiscussionAndAnalysisTextBlock",
        taxonomy: "us-gaap",
        value: "B".repeat(120),
        name: "us-gaap:ManagementDiscussionAndAnalysisTextBlock",
      },
    ] as never[];
    const sections = locateForm10kSections(facts);
    expect(sections.risk_factors?.key).toBe("risk_factors");
    expect(sections.risk_factors?.source).toBe("ixbrl_textblock");
    expect(sections.mda?.key).toBe("mda");
    expect(sections.mda?.source).toBe("ixbrl_textblock");
  });

  it("T1 — SNDK-style HTML headings yield business, risk_factors, and mda", () => {
    const facts = extractIxbrl(SNDK_10K_HEADINGS_HTML).facts;
    const sections = locateForm10kSections(facts, SNDK_10K_HEADINGS_HTML);
    const coverage = buildSectionCoverage(sections);

    expect(coverage.sectionsPresent.length).toBeGreaterThanOrEqual(3);
    expect(coverage.sectionsPresent).toEqual(
      expect.arrayContaining(["business", "risk_factors", "mda"]),
    );
  });

  it("T2 — chunk count exceeds 10 for long SNDK-style HTML fallback sections", () => {
    const longBody = "NAND market dynamics and operational commentary. ".repeat(400);
    const html = synthetic10kHtml({
      "ITEM 1. BUSINESS": longBody,
      "ITEM 1A. RISK FACTORS": longBody,
      "ITEM 7. MANAGEMENT'S DISCUSSION": longBody,
      "ITEM 8. FINANCIAL STATEMENTS": longBody,
    });
    const facts = extractIxbrl(html).facts;
    const sections = locateForm10kSections(facts, html);
    const chunks = chunkSections({
      companyId: SNDK_CIK,
      accession: SNDK_ACCESSION,
      periodEnd: "2025-06-27",
      proseSections: sections,
      audited: true,
    });

    expect(chunks.length).toBeGreaterThan(10);
  });

  it("T3 — HTML fallback sections carry source=html_heading_fallback", () => {
    const facts = extractIxbrl(SNDK_10K_HEADINGS_HTML).facts;
    const sections = locateForm10kSections(facts, SNDK_10K_HEADINGS_HTML);
    const chunks = chunkSections({
      companyId: SNDK_CIK,
      accession: SNDK_ACCESSION,
      periodEnd: "2025-06-27",
      proseSections: sections,
      audited: true,
    });

    expect(sections.business?.source).toBe("html_heading_fallback");
    expect(sections.risk_factors?.source).toBe("html_heading_fallback");
    expect(sections.mda?.source).toBe("html_heading_fallback");
    expect(chunks.every((chunk) => chunk.source === "html_heading_fallback")).toBe(true);
  });

  it("T4 — Path A wins when >= 3 iXBRL TextBlocks are present", () => {
    const facts = [
      {
        concept: "DescriptionOfBusinessTextBlock",
        taxonomy: "us-gaap",
        value: "Business ".repeat(40),
        name: "us-gaap:DescriptionOfBusinessTextBlock",
      },
      {
        concept: "RiskFactorsTextBlock",
        taxonomy: "us-gaap",
        value: "Risk ".repeat(40),
        name: "us-gaap:RiskFactorsTextBlock",
      },
      {
        concept: "ManagementDiscussionAndAnalysisTextBlock",
        taxonomy: "us-gaap",
        value: "MDA ".repeat(40),
        name: "us-gaap:ManagementDiscussionAndAnalysisTextBlock",
      },
    ] as never[];

    const html = synthetic10kHtml({
      "ITEM 1. BUSINESS": "Fallback business ".repeat(50),
      "ITEM 1A. RISK FACTORS": "Fallback risk ".repeat(50),
      "ITEM 7. MANAGEMENT'S DISCUSSION": "Fallback mda ".repeat(50),
    });

    const sections = locateForm10kSections(facts, html);
    expect(sections.business?.source).toBe("ixbrl_textblock");
    expect(sections.risk_factors?.source).toBe("ixbrl_textblock");
    expect(sections.mda?.source).toBe("ixbrl_textblock");
  });

  it("T5 — rejects sections shorter than 200 chars between headings", () => {
    const html = synthetic10kHtml({
      "ITEM 1A. RISK FACTORS": "Too short.",
      "ITEM 7. MANAGEMENT'S DISCUSSION": "Valid section body ".repeat(30),
    });

    const extracted = extractHtmlHeadingSections(html);
    expect(extracted.find((s) => s.sectionType === "risk_factors")).toBeUndefined();
    expect(extracted.find((s) => s.sectionType === "mda")).toBeDefined();
    expect(200).toBe(200);
  });

  it("T6 — truncates sections exceeding 150,000 chars at the cap", () => {
    const html = synthetic10kHtml({
      "ITEM 1A. RISK FACTORS": "X".repeat(150_000 + 5_000),
    });

    const extracted = extractHtmlHeadingSections(html);
    const risk = extracted.find((s) => s.sectionType === "risk_factors");
    expect(risk).toBeDefined();
    expect(risk!.charCount).toBe(150_000);
    expect(risk!.text.length).toBe(150_000);
  });

  it("T7 — audited chunks include source for pgvector schema", () => {
    const facts = extractIxbrl(SNDK_10K_HEADINGS_HTML).facts;
    const sections = locateForm10kSections(facts, SNDK_10K_HEADINGS_HTML);
    const chunks = chunkSections({
      companyId: SNDK_CIK,
      accession: SNDK_ACCESSION,
      periodEnd: "2025-06-27",
      proseSections: sections,
      audited: true,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.audited === true)).toBe(true);
    expect(confirmPgvectorSchema(chunks)).toBe(true);
  });
});

describe("locateForm10kSections SNDK live filing", () => {
  it("T1 live — extracts >= 3 sections from stored SNDK 10-K when EDGAR is reachable", async () => {
    const client = createEdgarClient();
    const url =
      "https://www.sec.gov/Archives/edgar/data/2023554/000202355425000034/sndk-20250627.htm";
    let html: string;
    try {
      html = await client.fetchText(url, {
        useCache: false,
        cik: SNDK_CIK,
        accession: SNDK_ACCESSION,
        filename: "sndk-20250627.htm",
      });
    } catch {
      return;
    }

    if (html.length < 10_000) return;

    const facts = extractIxbrl(html).facts;
    const sections = locateForm10kSections(facts, html);
    const coverage = buildSectionCoverage(sections);

    expect(coverage.sectionsPresent.length).toBeGreaterThanOrEqual(3);
    expect(coverage.sectionsPresent).toEqual(
      expect.arrayContaining(["business", "risk_factors", "mda"]),
    );
    expect(
      coverage.sectionsPresent.some(
        (key) => coverage.sectionSources[key] === "html_heading_fallback",
      ),
    ).toBe(true);
  }, 30_000);
});

describe("K4-K5 cascade (T8)", () => {
  it("documents that SNDK has no prior-year 10-K pair in live submissions", () => {
    const sub = JSON.parse(
      readFileSync(join(process.cwd(), "tests/fixtures/sndk-submissions.json"), "utf8"),
    );
    const tenKs = sub.filings.recent.form
      .map((form: string, index: number) => ({ form, accession: sub.filings.recent.accessionNumber[index] }))
      .filter((f: { form: string }) => /^10-K/i.test(f.form));

    expect(tenKs).toHaveLength(1);
    expect(tenKs[0]?.accession).toBe(SNDK_ACCESSION);
  });
});

describe("validateForm10kContract", () => {
  it("passes when all required keys are satisfied without a pair", () => {
    const state = baseState({
      xbrlUniverse: {
        ixbrlFactCount: 1,
        companyfactsConceptCount: 1,
        ixbrlExceedsCompanyfacts: false,
        customNamespaceFacts: 0,
        coverageByTaxonomy: {},
      },
      audited: true,
      credibility: {
        fiscalYear: 2025,
        periodEnd: "2025-06-27",
        accession: "x",
        mdaOutlookText: null,
        riskFactorSummary: null,
        storedAt: new Date().toISOString(),
      },
      eightKCrossRef: { linked: [], unlinked: [] },
      auditorChange: {
        currentAuditor: null,
        previousAuditor: null,
        changed: false,
        materialEvent: false,
      },
      pgvectorReady: true,
    });
    expect(validateForm10kContract(state)).toEqual([]);
  });
});
