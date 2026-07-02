import * as cheerio from "cheerio";

/** Strip HTML tags and collapse whitespace for chunking / classification. */
export function htmlToPlainText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const bodyText = $("body").text();
  const text = (bodyText || $.root().text()).replace(/\s+/g, " ").trim();
  return text;
}
