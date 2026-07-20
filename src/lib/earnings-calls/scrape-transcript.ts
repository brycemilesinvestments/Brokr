import { createHash } from "node:crypto";
import { fetchWebPage } from "@/lib/earnings-calls/fetch-web";
import {
  isValidTranscriptText,
  parseTranscriptHtml,
} from "@/lib/earnings-calls/parse-transcript-html";
import type { ScrapeTranscriptResult } from "@/lib/earnings-calls/types";
import { fetchSec } from "@/lib/edgar/sec-request";

export function buildSyntheticAccession(sourceUrl: string): string {
  const hash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16);
  return `ec-${hash}`;
}

async function fetchDocumentHtml(
  sourceUrl: string,
  signal?: AbortSignal,
): Promise<{ html: string; finalUrl: string }> {
  if (/sec\.gov/i.test(sourceUrl)) {
    const response = await fetchSec(sourceUrl, {
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
      signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${sourceUrl}`);
    }
    return { html: await response.text(), finalUrl: sourceUrl };
  }

  const result = await fetchWebPage(sourceUrl, { signal });
  return { html: result.html, finalUrl: result.url };
}

export async function scrapeTranscript(input: {
  sourceUrl: string;
  title?: string;
  signal?: AbortSignal;
}): Promise<ScrapeTranscriptResult> {
  const { html, finalUrl } = await fetchDocumentHtml(input.sourceUrl, input.signal);
  const parsed = parseTranscriptHtml(html);

  if (!isValidTranscriptText(parsed.plainText)) {
    throw new Error(
      `Document at ${finalUrl} does not look like an earnings call transcript (${parsed.charCount} chars)`,
    );
  }

  return {
    sourceUrl: finalUrl,
    title: input.title,
    plainText: parsed.plainText,
    charCount: parsed.charCount,
    html,
  };
}
