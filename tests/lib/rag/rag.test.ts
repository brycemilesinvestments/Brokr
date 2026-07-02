import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AiClient } from "@/lib/ai/client";
import { extractIxbrl } from "@/lib/edgar";
import { locateProseSections, emptyProseSections } from "@/lib/edgar/discovery";
import type { ProseSections } from "@/lib/edgar/discovery";

const FIXTURE_PROSE: ProseSections = {
  ...emptyProseSections(),
  mda: {
    key: "mda",
    concept: "ManagementDiscussionAndAnalysisTextBlock",
    taxonomy: "us-gaap",
    charCount: 500,
    source: "ixbrl_textblock",
    text: `Management's Discussion and Analysis of Financial Condition and Results of Operations.

Our revenue increased significantly during the third quarter driven by strong NAND demand.
Gross margin expanded as pricing improved across datacenter and client segments.
We continue to invest in technology leadership while managing operating expenses carefully.`,
  },
  risk_factors: {
    key: "risk_factors",
    concept: "RiskFactorsTextBlock",
    taxonomy: "us-gaap",
    charCount: 400,
    source: "ixbrl_textblock",
    text: `We face intense competition in NAND storage markets. Supply chain disruptions could adversely affect our operations.
Customer concentration among hyperscale buyers may increase pricing volatility.`,
  },
  revenue_concentration: null,
  subsequent_events: null,
  form_8k_body: null,
  exhibit_99_1: null,
};

function fixtureProseSections(ixbrlFacts: { concept: string; value: string }[]): ProseSections {
  const located = locateProseSections(ixbrlFacts as never);
  const hasText = Object.values(located).some((s) => s !== null && s.text.length > 50);
  return hasText ? located : FIXTURE_PROSE;
}
import { buildMetricSeriesBundle } from "@/lib/edgar/time-series";
import {
  REVENUE_CONCEPT,
  NOT_DISCLOSED_PHRASE,
  MemoryChunkStore,
  chunkSections,
  createLocalEmbeddingClient,
  embedAndStore,
  indexStructured,
  ingestFiling,
  routeQuestion,
  pullMetrics,
  vectorSearch,
  buildContext,
  buildPromptForInspection,
  groundedGenerate,
  runRagChat,
} from "@/lib/chat";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";

const sndkIxbrl = readFileSync(
  join(process.cwd(), "tests/fixtures/sndk-10q-ixbrl.htm"),
  "utf8",
);
const sndkIxbrlFacts = extractIxbrl(sndkIxbrl).facts;
const sndkBundle = buildMetricSeriesBundle(sndkCompanyFacts as never);
const CIK_A = "0002023554";
const CIK_B = "0000320193";
const ACCESSION = "0001628280-26-029401";

function mockAiClient(response: Record<string, unknown>): AiClient {
  return new AiClient({
    apiKey: "test-key",
    fetchFn: async () =>
      ({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: JSON.stringify(response) }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      }) as Response,
  });
}

async function seedSndkMetrics(store: MemoryChunkStore) {
  await indexStructured(store, {
    companyId: CIK_A,
    accession: ACCESSION,
    bundle: sndkBundle,
    companyFacts: sndkCompanyFacts as never,
    replaceCompany: true,
  });
}

describe("RAG chunk", () => {
  it("chunks prose on paragraph boundaries without mid-sentence splits", () => {
    const proseSections = fixtureProseSections(sndkIxbrlFacts);
    const chunks = chunkSections({
      companyId: CIK_A,
      accession: ACCESSION,
      periodEnd: "2026-04-03",
      proseSections,
    });

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.companyId).toBe(CIK_A);
      expect(chunk.accession).toBe(ACCESSION);
      expect(chunk.text.length).toBeGreaterThan(50);
      expect(chunk.text).not.toMatch(/\s$/);
    }
  });

  it("idempotent ingest: embedding same accession twice yields no duplicate vectors", async () => {
    const store = new MemoryChunkStore();
    const embedder = createLocalEmbeddingClient();
    const proseSections = fixtureProseSections(sndkIxbrlFacts);
    const chunks = chunkSections({
      companyId: CIK_A,
      accession: ACCESSION,
      periodEnd: "2026-04-03",
      proseSections,
    });

    const first = await embedAndStore(store, {
      companyId: CIK_A,
      accession: ACCESSION,
      chunks,
      embedder,
    });
    const second = await embedAndStore(store, {
      companyId: CIK_A,
      accession: ACCESSION,
      chunks,
      embedder,
    });

    expect(first.stored).toBeGreaterThan(0);
    expect(second.skippedDuplicate).toBe(true);
    expect(second.embedCalls).toBe(0);

    const { chunks: results } = await vectorSearch(store, embedder, {
      companyId: CIK_A,
      question: "management discussion",
      topK: 100,
    });
    const uniqueKeys = new Set(
      results.map((c) => `${c.accession}:${c.sectionType}:${c.chunkIndex}`),
    );
    expect(uniqueKeys.size).toBe(results.length);
  });

  it("company-isolation: query under company A returns zero company-B chunks", async () => {
    const store = new MemoryChunkStore();
    const embedder = createLocalEmbeddingClient();

    await embedAndStore(store, {
      companyId: CIK_A,
      accession: ACCESSION,
      chunks: [
        {
          companyId: CIK_A,
          accession: ACCESSION,
          sectionType: "mda",
          periodEnd: "2026-04-03",
          chunkIndex: 0,
          text: "Company A discusses NAND flash demand trends.",
          tokenCount: 10,
        },
      ],
      embedder,
    });

    await embedAndStore(store, {
      companyId: CIK_B,
      accession: "0000320193-24-000123",
      chunks: [
        {
          companyId: CIK_B,
          accession: "0000320193-24-000123",
          sectionType: "mda",
          periodEnd: "2024-09-28",
          chunkIndex: 0,
          text: "Company B secret strategy for unrelated markets.",
          tokenCount: 10,
        },
      ],
      embedder,
    });

    const { chunks } = await vectorSearch(store, embedder, {
      companyId: CIK_A,
      question: "secret strategy unrelated markets",
      topK: 10,
    });

    expect(chunks.every((c) => c.companyId === CIK_A)).toBe(true);
    expect(chunks.some((c) => c.companyId === CIK_B)).toBe(false);
    expect(chunks.some((c) => c.text.includes("Company B"))).toBe(false);
  });

  it("numeric-grounding: Q3 revenue returns exact structured $5.95B for SNDK", async () => {
    const store = new MemoryChunkStore();
    await seedSndkMetrics(store);

    const metrics = await pullMetrics(store, {
      companyId: CIK_A,
      question: "what was Q3 revenue",
    });

    const q3Revenue = metrics.find((m) => m.metricName === REVENUE_CONCEPT);
    expect(q3Revenue).toBeDefined();
    expect(q3Revenue?.fp).toBe("Q3");
    expect(q3Revenue?.value).toBe(5_950_000_000);

    const context = buildContext({
      companyId: CIK_A,
      companyName: "Sandisk Corporation",
      metrics,
      chunks: [],
    });
    const prompt = buildPromptForInspection(context, "numeric", "what was Q3 revenue");
    expect(prompt).toContain("STRUCTURED METRICS");
    expect(prompt).toContain("5.95B");
    expect(prompt).toContain("[structured:RevenueFromContractWithCustomerExcludingAssessedTax]");
  });

  it("refusal: undisclosed question returns not disclosed, not a guess", async () => {
    const store = new MemoryChunkStore();
    const ai = mockAiClient({
      answer: NOT_DISCLOSED_PHRASE,
      citations: [],
      refused: true,
    });

    const result = await runRagChat(
      {
        store,
        embedder: createLocalEmbeddingClient(),
        ai,
      },
      {
        companyId: CIK_A,
        companyName: "Sandisk Corporation",
        question: "what's their 2030 market share target",
        metricBundle: sndkBundle,
      },
    );

    expect(result.refused).toBe(true);
    expect(result.answer.toLowerCase()).toContain("not disclosed");
    expect(routeQuestion("what's their 2030 market share target")).toBe("qualitative");
  });

  it("citation test: narrative answer carries filing/period tags", async () => {
    const store = new MemoryChunkStore();
    const embedder = createLocalEmbeddingClient();
    await seedSndkMetrics(store);

    await embedAndStore(store, {
      companyId: CIK_A,
      accession: ACCESSION,
      chunks: [
        {
          companyId: CIK_A,
          accession: ACCESSION,
          sectionType: "risk_factors",
          periodEnd: "2026-04-03",
          chunkIndex: 0,
          text: "We face intense competition in NAND storage markets.",
          tokenCount: 12,
        },
      ],
      embedder,
    });

    const ai = mockAiClient({
      answer:
        "Management disclosed competitive pressure in NAND markets [accession:0001628280-26-029401|period:2026-04-03|section:risk_factors].",
      citations: [
        {
          accession: ACCESSION,
          periodEnd: "2026-04-03",
          sectionType: "risk_factors",
          claim: "intense competition in NAND storage markets",
        },
      ],
      refused: false,
    });

    const result = await runRagChat(
      { store, embedder, ai },
      {
        companyId: CIK_A,
        companyName: "Sandisk Corporation",
        question: "what competitive risks were disclosed",
        metricBundle: sndkBundle,
      },
    );

    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].accession).toBe(ACCESSION);
    expect(result.citations[0].sectionType).toBe("risk_factors");
  });

  it("budget test: repeat question triggers no chunk re-embedding", async () => {
    const store = new MemoryChunkStore();
    const embedder = createLocalEmbeddingClient();
    const embedSpy = vi.spyOn(embedder, "embedBatch");

    await ingestFiling(store, embedder, {
      companyId: CIK_A,
      accession: ACCESSION,
      periodEnd: "2026-04-03",
      ixbrlFacts: sndkIxbrlFacts,
      metricBundle: sndkBundle,
    });

    embedSpy.mockClear();

    const ai = mockAiClient({
      answer: "Revenue was $5.95B [structured].",
      citations: [],
      refused: false,
    });

    const first = await runRagChat(
      {
        store,
        embedder,
        ai,
        ixbrlFacts: sndkIxbrlFacts,
        accession: ACCESSION,
        periodEnd: "2026-04-03",
      },
      {
        companyId: CIK_A,
        companyName: "Sandisk Corporation",
        question: "what was Q3 revenue",
        metricBundle: sndkBundle,
      },
    );

    const second = await runRagChat(
      {
        store,
        embedder,
        ai,
        ixbrlFacts: sndkIxbrlFacts,
        accession: ACCESSION,
        periodEnd: "2026-04-03",
      },
      {
        companyId: CIK_A,
        companyName: "Sandisk Corporation",
        question: "what was Q3 revenue",
        metricBundle: sndkBundle,
      },
    );

    expect(first.embedCalls).toBe(0);
    expect(second.embedCalls).toBe(0);
    expect(embedSpy).not.toHaveBeenCalled();
  });

  it("grounded_generate refuses numeric questions without structured metrics", async () => {
    const ai = mockAiClient({
      answer: "Revenue was $10B",
      citations: [],
      refused: false,
    });

    const context = buildContext({
      companyId: CIK_A,
      companyName: "Test Co",
      metrics: [],
      chunks: [],
    });

    const result = await groundedGenerate(ai, {
      question: "what was revenue",
      context,
      route: "numeric",
      metricsUsed: [],
    });

    expect(result.refused).toBe(true);
    expect(result.answer).toContain("not disclosed");
  });
});
