import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractTranscriptLinksFromHtml,
  isValidTranscriptText,
  parseTranscriptHtml,
  pickTranscriptDocumentsFromItems,
} from "@/lib/earnings-calls";
import { buildSyntheticAccession } from "@/lib/earnings-calls/scrape-transcript";

const fixtureDir = join(process.cwd(), "tests/fixtures/earnings-calls");

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
});
