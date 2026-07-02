import * as cheerio from "cheerio";
import {
  DEFAULT_INSIDER_COUNT,
  formatCik,
  issuerInsiderDispUrl,
  SEC_USER_AGENT,
} from "@/lib/edgar/constants";
import type {
  InsiderTransaction,
  InsiderTransactionsPage,
  ReportingOwner,
} from "@/routes/company/[cik]/features/insider-transactions/types";
import { toAbsoluteSecUrl } from "@/lib/edgar/resolve-company";

function parseNumber(value: string): number | undefined {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseReportingOwners($: cheerio.CheerioAPI): ReportingOwner[] {
  const owners: ReportingOwner[] = [];

  $("table").each((_, table) => {
    const headerCells = $(table).find("tr").first().find("td, th");
    const headers = headerCells
      .map((__, cell) => $(cell).text().trim().toLowerCase())
      .get();

    if (!headers.includes("owner") || !headers.includes("type of owner")) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row).find("td");
        if (cells.length < 4) return;

        const ownerLink = $(cells[0]).find("a").first();
        const filingsLink = $(cells[1]).find("a").first();

        owners.push({
          ownerName: ownerLink.text().trim() || $(cells[0]).text().trim(),
          ownerUrl: toAbsoluteSecUrl(ownerLink.attr("href")),
          ownerCik: filingsLink.text().trim() || undefined,
          filingsUrl: toAbsoluteSecUrl(filingsLink.attr("href")),
          latestTransactionDate: $(cells[2]).text().trim() || undefined,
          ownerType: $(cells[3]).text().trim() || undefined,
        });
      });
  });

  return owners;
}

function parseTransactionReport($: cheerio.CheerioAPI): InsiderTransaction[] {
  const table = $("table#transaction-report").first();
  if (!table.length) return [];

  const transactions: InsiderTransaction[] = [];

  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 12) return;

    const acquiredOrDisposed = $(cells[0]).text().trim();
    const formLink = $(cells[4]).find("a").first();
    const formHref = formLink.attr("href");
    const accessionNumber = formHref?.match(/\/(\d{10}-\d{2}-\d{6})/)?.[1];

    transactions.push({
      acquiredOrDisposed:
        acquiredOrDisposed === "A" || acquiredOrDisposed === "D"
          ? acquiredOrDisposed
          : undefined,
      transactionDate: $(cells[1]).text().trim(),
      deemedExecutionDate: $(cells[2]).text().trim() || undefined,
      reportingOwner: $(cells[3]).text().trim(),
      form: formLink.text().trim() || $(cells[4]).text().trim() || undefined,
      transactionType: $(cells[5]).text().trim() || undefined,
      directOrIndirect: $(cells[6]).text().trim() || undefined,
      sharesTransacted: parseNumber($(cells[7]).text()),
      sharesOwnedFollowing: parseNumber($(cells[8]).text()),
      lineNumber: parseNumber($(cells[9]).text()),
      ownerCik: $(cells[10]).text().trim() || undefined,
      securityName: $(cells[11]).text().trim() || undefined,
      formUrl: toAbsoluteSecUrl(formHref),
      accessionNumber,
    });
  });

  return transactions;
}

function hasNextPage($: cheerio.CheerioAPI): boolean {
  return $('input[type="button"][value="Next 80"]').length > 0;
}

function buildOwnerTypeLookup(
  reportingOwners: ReportingOwner[],
): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const owner of reportingOwners) {
    if (!owner.ownerType) continue;

    if (owner.ownerCik) {
      lookup.set(owner.ownerCik, owner.ownerType);
    }

    lookup.set(owner.ownerName.toLowerCase(), owner.ownerType);
  }

  return lookup;
}

function enrichTransactionsWithOwnerType(
  transactions: InsiderTransaction[],
  reportingOwners: ReportingOwner[],
): InsiderTransaction[] {
  const ownerTypeByKey = buildOwnerTypeLookup(reportingOwners);

  return transactions.map((transaction) => {
    if (transaction.ownerType) return transaction;

    const ownerType =
      (transaction.ownerCik && ownerTypeByKey.get(transaction.ownerCik)) ||
      ownerTypeByKey.get(transaction.reportingOwner.toLowerCase());

    return ownerType ? { ...transaction, ownerType } : transaction;
  });
}

async function fetchInsiderPage(cik: string, start: number): Promise<string> {
  const url = issuerInsiderDispUrl(cik, start);
  const response = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load insider transactions for CIK ${cik} at offset ${start} (${response.status})`,
    );
  }

  return response.text();
}

export async function fetchInsiderTransactions(
  cikInput: string | number,
): Promise<InsiderTransactionsPage> {
  const cik = formatCik(cikInput);
  const secUrl = issuerInsiderDispUrl(cik);

  const allTransactions: InsiderTransaction[] = [];
  const seenKeys = new Set<string>();
  let reportingOwners: ReportingOwner[] = [];
  let start = 0;

  while (true) {
    const html = await fetchInsiderPage(cik, start);
    const $ = cheerio.load(html);

    if (start === 0) {
      const title = $("title").text();
      if (!title.toLowerCase().includes("ownership information")) {
        throw new Error(`No insider ownership data found for CIK ${cik}`);
      }
      reportingOwners = parseReportingOwners($);
    }

    const pageTransactions = parseTransactionReport($);

    for (const transaction of pageTransactions) {
      const key = [
        transaction.accessionNumber,
        transaction.lineNumber,
        transaction.reportingOwner,
        transaction.transactionDate,
        transaction.transactionType,
        transaction.sharesTransacted,
      ].join("|");

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      allTransactions.push(transaction);
    }

    const isLastPage = pageTransactions.length < DEFAULT_INSIDER_COUNT || !hasNextPage($);
    if (isLastPage) break;

    start += DEFAULT_INSIDER_COUNT;
  }

  const transactions = enrichTransactionsWithOwnerType(
    allTransactions,
    reportingOwners,
  );

  return {
    cik,
    secUrl,
    reportingOwners,
    transactions,
    totalShown: transactions.length,
  };
}
