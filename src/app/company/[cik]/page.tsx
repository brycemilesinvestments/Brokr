import { notFound } from "next/navigation";
import { CompanyDataTabs } from "@/routes/company/[cik]";
import { buildCompanyTimeline } from "@/routes/company/[cik]/features/filings/lib/build-company-timeline";
import { fetchCompanyFilings } from "@/routes/company/[cik]/lib/fetch-company-filings";
import { fetchInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-insider-transactions";
import { fetchOutstandingShares } from "@/routes/company/[cik]/features/outstanding-shares/lib/fetch-outstanding-shares";
import { fetchFinancialTrends } from "@/routes/company/[cik]/features/financial-trends/lib/fetch-financial-trends";
import { recordCompanyView } from "@/routes/company/[cik]/lib/record-company-view";
import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";

type PageProps = {
  params: Promise<{ cik: string }>;
};

export default async function CompanyPage({ params }: PageProps) {
  const { cik } = await params;

  const [page, companyMeta] = await Promise.all([
    fetchCompanyFilings(cik, undefined, { maxPages: 1 }).catch(() => null),
    resolveCompanyByCik(cik),
  ]);
  if (!page) notFound();

  const [timeline, insider, outstandingShares, financialTrends] = await Promise.all([
    buildCompanyTimeline(cik, page.filings, page.info.fiscalYearEnd),
    fetchInsiderTransactions(cik).catch(() => null),
    fetchOutstandingShares(cik),
    fetchFinancialTrends(cik).catch(() => null),
  ]);
  await recordCompanyView(page, companyMeta);

  return (
    <CompanyDataTabs
      cik={page.cik}
      companyName={page.info.name}
      ticker={companyMeta?.ticker || undefined}
      timeline={timeline}
      fiscalYearEnd={page.info.fiscalYearEnd}
      filings={page.filings}
      totalShown={page.totalShown}
      hasMoreFilings={page.hasMoreFilings}
      insider={insider}
      outstandingShares={outstandingShares}
      financialTrends={financialTrends}
    />
  );
}
