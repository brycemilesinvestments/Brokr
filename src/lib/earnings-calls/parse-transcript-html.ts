import * as cheerio from "cheerio";
import { MIN_TRANSCRIPT_CHARS } from "@/lib/earnings-calls/constants";

const TRANSCRIPT_CONTAINER_SELECTORS = [
  "article",
  "main",
  '[class*="transcript"]',
  '[id*="transcript"]',
  '[data-testid*="transcript"]',
  ".article-body",
  ".entry-content",
  ".node__content",
];

const SPEAKER_LINE_PATTERN =
  /^(operator|unidentified|question|answer|q&a|[A-Z][A-Za-z .'-]{1,40}\s*[-–—:])/i;

function htmlToPlainText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const bodyText = $("body").text();
  return (bodyText || $.root().text()).replace(/\s+/g, " ").trim();
}

function htmlToTranscriptText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript").remove();

  const paragraphs: string[] = [];
  $("p, li, blockquote").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (text.length > 0) paragraphs.push(text);
  });

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n");
  }

  return htmlToPlainText(html);
}

function looksLikeTranscript(text: string): boolean {
  if (text.length < MIN_TRANSCRIPT_CHARS) return false;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const speakerLines = lines.filter((line) => SPEAKER_LINE_PATTERN.test(line)).length;
  return speakerLines >= 8 || /question[\s-]?and[\s-]?answer|prepared remarks/i.test(text);
}

function extractFromSelectors($: cheerio.CheerioAPI): string {
  for (const selector of TRANSCRIPT_CONTAINER_SELECTORS) {
    const element = $(selector).first();
    if (!element.length) continue;
    const text = htmlToTranscriptText(element.html() ?? "");
    if (text.length >= MIN_TRANSCRIPT_CHARS) return text;
  }
  return "";
}

/**
 * Parse earnings call transcript body text from HTML.
 */
export function parseTranscriptHtml(html: string): { plainText: string; charCount: number } {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript").remove();

  const targeted = extractFromSelectors($);
  const plainText = (targeted || htmlToTranscriptText($.root().html() ?? ""))
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    plainText,
    charCount: plainText.length,
  };
}

export function isValidTranscriptText(text: string): boolean {
  return looksLikeTranscript(text);
}
