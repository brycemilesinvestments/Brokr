import { discoverForm345Filings } from "@/lib/orchestrate/form-345";
import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";
import { countForm345TransactionsByIssuerCik } from "@/lib/supabase/form345";
import { fetchCompanyFilings } from "@/routes/company/[cik]/lib/fetch-company-filings";
import { recordCompanyView } from "@/routes/company/[cik]/lib/record-company-view";
import type { Filing } from "@/routes/company/[cik]/types";

export type CompanyLayoutData = {
  cik: string;
  companyName: string;
  ticker?: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings: boolean;
  showInsider: boolean;
};

export async function fetchCompanyLayoutData(cik: string): Promise<CompanyLayoutData | null> {
  const [page, companyMeta, storedCount, form345Sample] = await Promise.all([
    fetchCompanyFilings(cik, undefined, { maxPages: 1 }).catch(() => null),
    resolveCompanyByCik(cik),
    countForm345TransactionsByIssuerCik(cik).catch(() => 0),
    discoverForm345Filings(cik, 1).catch(() => []),
  ]);

  if (!page) return null;

  await recordCompanyView(page, companyMeta);

  return {
    cik: page.cik,
    companyName: page.info.name,
    ticker: companyMeta?.ticker || undefined,
    filings: page.filings,
    totalShown: page.totalShown,
    hasMoreFilings: page.hasMoreFilings,
    showInsider: storedCount > 0 || form345Sample.length > 0,
  };
}
