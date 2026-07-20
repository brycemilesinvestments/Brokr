import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  extractTranscriptLinksFromHtml,
  isValidTranscriptText,
  parseTranscriptHtml,
  pickTranscriptDocumentsFromItems,
  runEarningsCallScrape,
} from "@/lib/earnings-calls";
import { buildSyntheticAccession, scrapeTranscript } from "@/lib/earnings-calls/scrape-transcript";
import { MemoryChunkStore } from "@/lib/rag/store/chunk-store";
import { MemoryEarningsCallTranscriptStore } from "@/lib/supabase/earnings-calls";
import type { CompanyRow } from "@/lib/supabase/companies";

const fixtureDir = join(process.cwd(), "tests/fixtures/earnings-calls");

const company: CompanyRow = {
  id: 42,
  edgar_id: "0000320193",
  name: "Example Corp",
  ticker: "EXMP",
  sic: null,
  sic_description: null,
  state: null,
  last_viewed_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const candidate = {
  sourceUrl: "https://investor.example.com/q1-2025-earnings-call-transcript.html",
  sourceType: "ir_site" as const,
  title: "Q1 2025 Earnings Call Transcript",
  eventDate: "2025-04-30",
  score: 4,
  reasons: ["test"],
};

vi.mock("@/lib/earnings-calls/scrape-transcript", async () => {
  const actual = await vi.importActual<typeof import("@/lib/earnings-calls/scrape-transcript")>(
    "@/lib/earnings-calls/scrape-transcript",
  );
  return {
    ...actual,
    scrapeTranscript: vi.fn(actual.scrapeTranscript),
  };
});

describe("earnings call scraper", () => {
  it("extracts transcript links from investor relations HTML", () => {
    const html = readFileSync(join(fixtureDir, "ir-events-page.html"), "utf8");
    const links = extractTranscriptLinksFromHtml("https://investor.example.com/events", html);

    expect(links).toHaveLength(1);
    expect(links[0]?.sourceUrl).toBe(
      "https://investor.example.com/events/q1-2025-earnings-call-transcript.html",
    );
    expect(links[0]?.sourceType).toBe("ir_site");
  });

  it("parses transcript body text from HTML", () => {
    const html = readFileSync(join(fixtureDir, "sample-transcript.html"), "utf8");
    const parsed = parseTranscriptHtml(html);

    expect(parsed.charCount).toBeGreaterThan(500);
    expect(parsed.plainText).toContain("raising full-year guidance");
    expect(isValidTranscriptText(parsed.plainText)).toBe(true);
  });

  it("picks SEC filing index documents that look like transcripts", () => {
    const items = pickTranscriptDocumentsFromItems([
      { name: "ex991earningsrelease.htm", description: "EX-99.1 Earnings Release" },
      { name: "ex992earningscalltranscript.htm", description: "EX-99.2 Earnings Call Transcript" },
      { name: "ex993slides.pdf", description: "EX-99.3 Investor Presentation" },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("ex992earningscalltranscript.htm");
  });

  it("builds stable synthetic accessions from source URLs", () => {
    const first = buildSyntheticAccession("https://example.com/transcript-a");
    const second = buildSyntheticAccession("https://example.com/transcript-a");
    const other = buildSyntheticAccession("https://example.com/transcript-b");

    expect(first).toBe(second);
    expect(first.startsWith("ec-")).toBe(true);
    expect(other).not.toBe(first);
  });

  it("scrapes and embeds once, then skips network scrape on second run", async () => {
    const html = readFileSync(join(fixtureDir, "sample-transcript.html"), "utf8");
    const parsed = parseTranscriptHtml(html);
    const scrapeMock = vi.mocked(scrapeTranscript);
    scrapeMock.mockResolvedValue({
      sourceUrl: candidate.sourceUrl,
      title: candidate.title,
      plainText: parsed.plainText,
      charCount: parsed.charCount,
      html,
    });

    const transcriptStore = new MemoryEarningsCallTranscriptStore();
    const chunkStore = new MemoryChunkStore();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network fetch should not run on cached transcript");
      }),
    );

    const first = await runEarningsCallScrape(company, {
      filings: [],
      candidates: [candidate],
      store: transcriptStore,
      chunkStore,
    });

    expect(first.scraped).toBe(1);
    expect(first.embedded).toBe(1);
    expect(scrapeMock).toHaveBeenCalledTimes(1);

    const second = await runEarningsCallScrape(company, {
      filings: [],
      candidates: [candidate],
      store: transcriptStore,
      chunkStore,
    });

    expect(second.scraped).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.embedded).toBe(0);
    expect(scrapeMock).toHaveBeenCalledTimes(1);

    const syntheticAccession = buildSyntheticAccession(candidate.sourceUrl);
    const status = await chunkStore.getIngestStatus(company.edgar_id, syntheticAccession);
    expect(status?.embeddedDone).toBe(true);

    vi.unstubAllGlobals();
  });
});
