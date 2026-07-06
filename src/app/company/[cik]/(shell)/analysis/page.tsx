import { fetchCompanyFilings } from "@/routes/company/[cik]/lib/fetch-company-filings";
import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";
import { notFound } from "next/navigation";
import { AnalysisPageContent } from "@/routes/company/[cik]/components/analysis-page-content/analysis-page-content";

type PageProps = {
  params: Promise<{ cik: string }>;
};

export default async function AnalysisPage({ params }: PageProps) {
  const { cik } = await params;

  const [page, companyMeta] = await Promise.all([
    fetchCompanyFilings(cik, undefined, { maxPages: 1 }).catch(() => null),
    resolveCompanyByCik(cik),
  ]);
  if (!page) notFound();

  return (
    <AnalysisPageContent
      cik={page.cik}
      filings={page.filings}
      ticker={companyMeta?.ticker || undefined}
    />
  );
}
