import * as cheerio from "cheerio";
import {
  companyFilingsUrl,
  companySearchUrl,
  formatCik,
  SEC_BASE_URL,
  SEC_USER_AGENT,
} from "@/lib/edgar/constants";
import { getCompanyTickers, normalizeQuery } from "@/lib/edgar/tickers";
import type {
  CompanyMatch,
  CompanySearchResult,
  CompanyTicker,
} from "@/lib/edgar/types";

function scoreMatch(query: string, company: CompanyTicker): number {
  const q = query.toLowerCase();
  const ticker = company.ticker.toLowerCase();
  const title = company.title.toLowerCase();

  if (ticker === q) return 100;
  if (title === q) return 95;
  if (title.startsWith(q)) return 85;
  if (ticker.startsWith(q)) return 80;
  if (title.includes(q)) return 70;
  if (ticker.includes(q)) return 60;

  const words = q.split(/\s+/).filter(Boolean);
  const titleWords = title.split(/\s+/);
  const matchedWords = words.filter((word) =>
    titleWords.some((titleWord) => titleWord.startsWith(word) || titleWord.includes(word)),
  );

  if (matchedWords.length === words.length && words.length > 0) {
    return 50 + matchedWords.length;
  }

  return 0;
}

function cleanSecCompanyTitle(title: string): string {
  return title.replace(/\s*SIC:.*/i, "").trim();
}

function scoreSecMatch(query: string, title: string): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();

  if (t === q) return 95;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 50;
  return 30;
}

function mergeMatches(
  tickerMatches: CompanyMatch[],
  secMatches: CompanyMatch[],
): CompanyMatch[] {
  const byCik = new Map<number, CompanyMatch>();

  for (const match of [...tickerMatches, ...secMatches]) {
    const existing = byCik.get(match.cik);
    if (!existing) {
      byCik.set(match.cik, match);
      continue;
    }

    byCik.set(match.cik, {
      cik: match.cik,
      title: existing.title || match.title,
      ticker: existing.ticker || match.ticker,
      score: Math.max(existing.score, match.score),
    });
  }

  return [...byCik.values()].toSorted(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  );
}

function isExactTickerQuery(query: string, matches: CompanyMatch[]): boolean {
  const normalized = query.toUpperCase();
  return matches.some(
    (match) => match.score === 100 && match.ticker.toUpperCase() === normalized,
  );
}

function rankTickerMatches(query: string, tickers: CompanyTicker[]): CompanyMatch[] {
  const matches: CompanyMatch[] = [];
  for (const company of tickers) {
    const score = scoreMatch(query, company);
    if (score > 0) matches.push({ ...company, score });
  }
  return matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

async function fetchSecHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`SEC request failed (${response.status})`);
  }

  return response.text();
}

async function searchSecCompanyList(query: string): Promise<CompanyMatch[]> {
  const html = await fetchSecHtml(companySearchUrl(query));
  const $ = cheerio.load(html);

  const directCompany = $(".companyName").first().text().trim();
  if (directCompany) {
    const cikLink = $(".companyName a").first().attr("href") ?? "";
    const cikMatch = cikLink.match(/CIK=(\d+)/i);
    if (cikMatch) {
      return [
        {
          cik: Number(cikMatch[1]),
          ticker: "",
          title: cleanSecCompanyTitle(directCompany.replace(/\s*CIK\s*#:.*/i, "").trim()),
          score: scoreSecMatch(query, cleanSecCompanyTitle(directCompany)),
        },
      ];
    }
  }

  const matches: CompanyMatch[] = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("th")
      .map((__, th) => $(th).text().trim().toLowerCase())
      .get();

    if (!headers.includes("cik") || !headers.includes("company")) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => $(cell).text().trim())
          .get();

        if (cells.length < 2) return;

        const cik = Number(cells[0].replace(/\D/g, ""));
        const cleanedTitle = cleanSecCompanyTitle(cells[1]);
        if (!cik || !cleanedTitle) return;

        matches.push({
          cik,
          ticker: "",
          title: cleanedTitle,
          score: scoreSecMatch(query, cleanedTitle),
        });
      });
  });

  return matches.slice(0, 20);
}

export async function resolveCompany(query: string): Promise<CompanySearchResult> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return { kind: "none", query: normalized };
  }

  const tickers = await getCompanyTickers();
  const tickerMatches = rankTickerMatches(normalized, tickers);

  if (isExactTickerQuery(normalized, tickerMatches)) {
    const exact = tickerMatches.find(
      (match) => match.score === 100 && match.ticker.toUpperCase() === normalized.toUpperCase(),
    );
    if (exact) {
      const { score: _score, ...company } = exact;
      return { kind: "single", company };
    }
  }

  const secMatches = await searchSecCompanyList(normalized);
  const merged = mergeMatches(tickerMatches, secMatches);

  if (merged.length === 1) {
    const { score: _score, ...company } = merged[0];
    return { kind: "single", company };
  }

  if (merged.length > 1) {
    return { kind: "multiple", matches: merged.slice(0, 12) };
  }

  return { kind: "none", query: normalized };
}

export async function resolveCompanyByCik(cik: string): Promise<CompanyTicker | null> {
  const normalizedCik = formatCik(cik);
  const tickers = await getCompanyTickers();
  const match = tickers.find((company) => formatCik(company.cik) === normalizedCik);

  if (match) return match;

  try {
    const html = await fetchSecHtml(companyFilingsUrl(normalizedCik));
    const $ = cheerio.load(html);
    const companyName = $(".companyName").first().text().trim();
    if (!companyName) return null;

    return {
      cik: Number(normalizedCik),
      ticker: "",
      title: companyName.replace(/\s*CIK\s*#:.*/i, "").trim(),
    };
  } catch {
    return null;
  }
}

function getSecFilingsPageUrl(cik: string | number): string {
  return companyFilingsUrl(cik);
}

export function toAbsoluteSecUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${SEC_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Resolve SEC inline-viewer links to direct archive document URLs. */
export function resolveSecDocumentUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;

  try {
    const url = new URL(path, SEC_BASE_URL);
    if (url.pathname === "/ix") {
      const doc = url.searchParams.get("doc");
      if (doc) return toAbsoluteSecUrl(doc);
    }
  } catch {
    // Fall through to absolute URL resolution.
  }

  return toAbsoluteSecUrl(path);
}
