import * as cheerio from "cheerio";
import {
  companyFilingsUrl,
  DEFAULT_FILING_COUNT,
  formatCik,
  parseAccessionNumber,
  SEC_USER_AGENT,
} from "@/lib/edgar/constants";
import type { CompanyFilingsPage, CompanyInfo, Filing } from "@/routes/company/[cik]/types";
import { toAbsoluteSecUrl } from "@/lib/edgar/resolve-company";

function parseAddressBlock($: cheerio.CheerioAPI, container: ReturnType<cheerio.CheerioAPI>) {
  return container
    .find(".mailerAddress")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

function parseCompanyInfo($: cheerio.CheerioAPI, cik: string): CompanyInfo {
  const mailers = $(".filerDiv .mailer");
  const mailingAddress = parseAddressBlock($, mailers.eq(0));
  const businessAddress = parseAddressBlock($, mailers.eq(1));

  const companyNameText = $(".companyName").first().text().trim();
  const name = companyNameText.replace(/\s*CIK\s*#:.*/i, "").trim();

  const identText = $(".identInfo").first().text();
  const sicMatch = identText.match(/SIC:\s*(\d+)\s*-\s*([^\n]+)/i);
  const stateMatch = identText.match(/State location:\s*([A-Z]{2})/i);
  const incorpMatch = identText.match(/State of Inc\.:\s*([A-Z]{2})/i);
  const fiscalMatch = identText.match(/Fiscal Year End:\s*(\d+)/i);

  const phone = businessAddress.find((line) => /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line));

  return {
    name,
    cik,
    sic: sicMatch?.[1],
    sicDescription: sicMatch?.[2]?.trim(),
    state: stateMatch?.[1],
    stateOfIncorporation: incorpMatch?.[1],
    fiscalYearEnd: fiscalMatch?.[1],
    mailingAddress,
    businessAddress: businessAddress.filter((line) => line !== phone),
    phone,
  };
}

function parseFilings($: cheerio.CheerioAPI): Filing[] {
  const table = $("table.tableFile2").first();
  if (!table.length) return [];

  const filings: Filing[] = [];

  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 5) return;

    const type = $(cells[0]).text().trim();
    const descriptionLink = $(cells[1]).find("a").first();
    const documentsLink = $(cells[2]).find("a").first();
    const filingDate = $(cells[3]).text().trim();
    const filingHref = $(cells[1]).find("a").last().attr("href");
    const accessionNumber = parseAccessionNumber(filingHref);
    const size = $(cells[4]).text().trim();

    filings.push({
      type,
      description: descriptionLink.text().trim() || $(cells[1]).text().trim(),
      documentsUrl: toAbsoluteSecUrl(documentsLink.attr("href")),
      filingDate,
      filingHref: toAbsoluteSecUrl(filingHref),
      accessionNumber,
      size: size || undefined,
    });
  });

  return filings;
}

function hasNextPage($: cheerio.CheerioAPI): boolean {
  return $('input[type="button"][value="Next100"]').length > 0;
}

async function fetchFilingsPage(cik: string, start: number, count: number): Promise<string> {
  const url = companyFilingsUrl(cik, count, start);
  const response = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load SEC filings for CIK ${cik} at offset ${start} (${response.status})`,
    );
  }

  return response.text();
}

export async function fetchCompanyFilings(
  cikInput: string | number,
  count = DEFAULT_FILING_COUNT,
  options: { maxPages?: number } = {},
): Promise<CompanyFilingsPage> {
  const cik = formatCik(cikInput);
  const secUrl = companyFilingsUrl(cik, count);

  const allFilings: Filing[] = [];
  const seenAccessions = new Set<string>();
  let start = 0;
  let pageIndex = 0;
  let info: CompanyInfo | null = null;
  let hasMoreFilings = false;

  while (true) {
    const html = await fetchFilingsPage(cik, start, count);
    const $ = cheerio.load(html);

    if (start === 0 && !$(".companyName").length) {
      throw new Error(`No SEC company found for CIK ${cik}`);
    }

    if (start === 0) {
      info = parseCompanyInfo($, cik);
    }

    const pageFilings = parseFilings($);

    for (const filing of pageFilings) {
      const key = filing.accessionNumber ?? `${filing.filingDate}-${filing.type}-${filing.description}`;
      if (seenAccessions.has(key)) continue;
      seenAccessions.add(key);
      allFilings.push(filing);
    }

    pageIndex += 1;
    const isLastPage = pageFilings.length < count || !hasNextPage($);
    if (isLastPage) break;

    if (options.maxPages && pageIndex >= options.maxPages) {
      hasMoreFilings = true;
      break;
    }

    start += count;
  }

  if (!info) {
    throw new Error(`No SEC company found for CIK ${cik}`);
  }

  return {
    cik,
    info,
    filings: allFilings,
    secUrl,
    totalShown: allFilings.length,
    hasMoreFilings,
  };
}
