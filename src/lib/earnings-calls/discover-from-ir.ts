import * as cheerio from "cheerio";
import {
  IR_CRAWL_PATHS,
  TRANSCRIPT_LINK_PATTERN,
} from "@/lib/earnings-calls/constants";
import { fetchWebPage } from "@/lib/earnings-calls/fetch-web";
import type { TranscriptCandidate } from "@/lib/earnings-calls/types";

function resolveHref(baseUrl: string, href: string | undefined): string | null {
  if (!href?.trim()) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseDateFromText(text: string): string | undefined {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];

  const us = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (us) {
    const [, month, day, year] = us;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthName = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/i,
  );
  if (monthName) {
    const monthMap: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const monthKey = monthName[1].slice(0, 3).toLowerCase();
    const month = monthMap[monthKey];
    if (month) {
      return `${monthName[3]}-${month}-${monthName[2].padStart(2, "0")}`;
    }
  }

  return undefined;
}

function scoreIrLink(text: string, href: string): { score: number; reasons: string[] } {
  const combined = `${text} ${href}`;
  const reasons: string[] = [];
  let score = 1;

  if (/transcript/i.test(combined)) {
    score += 3;
    reasons.push("link_mentions_transcript");
  }
  if (/earnings[\s_-]?call|conference[\s_-]?call/i.test(combined)) {
    score += 2;
    reasons.push("link_mentions_earnings_call");
  }
  if (/\.pdf$/i.test(href)) {
    score -= 1;
    reasons.push("pdf_link_deprioritized");
  }
  if (/\.(htm|html)$/i.test(href)) {
    score += 1;
    reasons.push("html_document");
  }

  return { score, reasons };
}

export function extractTranscriptLinksFromHtml(
  baseUrl: string,
  html: string,
): TranscriptCandidate[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const candidates: TranscriptCandidate[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const resolved = resolveHref(baseUrl, href);
    if (!resolved || seen.has(resolved)) return;

    const combined = `${text} ${resolved}`;
    if (!TRANSCRIPT_LINK_PATTERN.test(combined)) return;

    seen.add(resolved);
    const { score, reasons } = scoreIrLink(text, resolved);
    const context = $(element).closest("tr, li, article, section, div").text().replace(/\s+/g, " ");

    candidates.push({
      sourceUrl: resolved,
      sourceType: "ir_site",
      title: text || undefined,
      eventDate: parseDateFromText(context) ?? parseDateFromText(text),
      score,
      reasons: ["ir_site_link", ...reasons],
    });
  });

  return candidates;
}

/**
 * Crawl common investor-relations paths for transcript links (free HTML scrape).
 */
export async function discoverTranscriptsFromIr(
  irBaseUrl: string,
  limit = 20,
): Promise<TranscriptCandidate[]> {
  const base = new URL(irBaseUrl);
  const collected: TranscriptCandidate[] = [];
  const seenUrls = new Set<string>();

  for (const path of IR_CRAWL_PATHS) {
    if (collected.length >= limit) break;

    const pageUrl = new URL(path, base).toString();
    try {
      const { html } = await fetchWebPage(pageUrl);
      const links = extractTranscriptLinksFromHtml(pageUrl, html);
      for (const link of links) {
        if (seenUrls.has(link.sourceUrl)) continue;
        seenUrls.add(link.sourceUrl);
        collected.push(link);
        if (collected.length >= limit) break;
      }
    } catch {
      // IR paths vary widely; skip unreachable pages.
    }
  }

  return collected.sort((a, b) => b.score - a.score);
}
