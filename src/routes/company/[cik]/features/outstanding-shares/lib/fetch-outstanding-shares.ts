import { companyFactsUrl, submissionsUrl } from "@/lib/edgar";
import { formatCik, SEC_USER_AGENT } from "@/lib/edgar/constants";
import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";
import { filingPagePath } from "@/lib/edgar/constants";

type XbrlFactUnit = {
  end?: string;
  val: number;
  accn: string;
  fy?: number;
  fp?: string;
  form: string;
  filed: string;
};

type SecCompanyFactsResponse = {
  facts?: {
    dei?: {
      EntityCommonStockSharesOutstanding?: {
        units?: {
          shares?: XbrlFactUnit[];
        };
      };
    };
    "us-gaap"?: {
      CommonStockSharesOutstanding?: {
        units?: {
          shares?: XbrlFactUnit[];
        };
      };
    };
  };
};

const PERIODIC_REPORT_PATTERN = /^10-(?:K|Q)/i;

function isPeriodicReport(form: string): boolean {
  return PERIODIC_REPORT_PATTERN.test(form.trim());
}

function extractFacts(
  units: XbrlFactUnit[] | undefined,
  source: OutstandingSharePoint["source"],
  cik: string,
): OutstandingSharePoint[] {
  if (!units?.length) return [];

  return units
    .filter((item) => item.end && isPeriodicReport(item.form))
    .map((item) => ({
      asOfDate: item.end!,
      shares: item.val,
      form: item.form,
      filedDate: item.filed,
      fiscalYear: item.fy,
      fiscalPeriod: item.fp,
      accessionNumber: item.accn,
      source,
      filingUrl: filingPagePath(cik, item.accn),
    }));
}

function dedupeByAsOfDate(points: OutstandingSharePoint[]): OutstandingSharePoint[] {
  const byDate = new Map<string, OutstandingSharePoint>();

  for (const point of points) {
    const existing = byDate.get(point.asOfDate);
    if (!existing) {
      byDate.set(point.asOfDate, point);
      continue;
    }

    const existingFiled = Date.parse(existing.filedDate);
    const nextFiled = Date.parse(point.filedDate);
    const preferNext =
      nextFiled > existingFiled ||
      (nextFiled === existingFiled && point.source === "cover-page" && existing.source !== "cover-page");

    if (preferNext) {
      byDate.set(point.asOfDate, point);
    }
  }

  return [...byDate.values()].sort(
    (a, b) => Date.parse(a.asOfDate) - Date.parse(b.asOfDate),
  );
}

export async function fetchOutstandingShares(
  cikInput: string | number,
): Promise<OutstandingSharePoint[]> {
  const cik = formatCik(cikInput);
  const response = await fetch(companyFactsUrl(cik), {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as SecCompanyFactsResponse;
  const coverPage = extractFacts(
    data.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares,
    "cover-page",
    cik,
  );
  const balanceSheet = extractFacts(
    data.facts?.["us-gaap"]?.CommonStockSharesOutstanding?.units?.shares,
    "balance-sheet",
    cik,
  );

  return dedupeByAsOfDate([...coverPage, ...balanceSheet]);
}

export { companyFactsUrl, submissionsUrl };
