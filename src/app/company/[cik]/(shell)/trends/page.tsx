import { fetchFinancialTrends } from "@/routes/company/[cik]/features/financial-trends/lib/fetch-financial-trends";
import { TrendsPageContent } from "@/routes/company/[cik]/components/trends-page-content/trends-page-content";

type PageProps = {
  params: Promise<{ cik: string }>;
};

export default async function TrendsPage({ params }: PageProps) {
  const { cik } = await params;
  const data = await fetchFinancialTrends(cik).catch(() => null);

  return <TrendsPageContent data={data} />;
}
