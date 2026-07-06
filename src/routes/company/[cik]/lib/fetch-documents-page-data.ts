import { buildCompanyTimeline } from "@/routes/company/[cik]/features/filings/lib/build-company-timeline";
import { fetchCompanyFilings } from "@/routes/company/[cik]/lib/fetch-company-filings";
import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";
import type { Filing } from "@/routes/company/[cik]/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

export type DocumentsPageData = {
  cik: string;
  companyName: string;
  ticker?: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings?: boolean;
  timeline: TimelineFiling[];
  fiscalYearEnd?: string;
};

export async function fetchDocumentsPageData(cik: string): Promise<DocumentsPageData | null> {
  const [page, companyMeta] = await Promise.all([
    fetchCompanyFilings(cik, undefined, { maxPages: 1 }).catch(() => null),
    resolveCompanyByCik(cik),
  ]);
  if (!page) return null;

  const timeline = await buildCompanyTimeline(cik, page.filings, page.info.fiscalYearEnd);

  return {
    cik: page.cik,
    companyName: page.info.name,
    ticker: companyMeta?.ticker || undefined,
    filings: page.filings,
    totalShown: page.totalShown,
    hasMoreFilings: page.hasMoreFilings,
    timeline,
    fiscalYearEnd: page.info.fiscalYearEnd,
  };
}
