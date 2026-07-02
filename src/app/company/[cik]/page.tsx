import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDataTabs, CompanyInfoCard } from "@/routes/company/[cik]";
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

  let page;
  try {
    page = await fetchCompanyFilings(cik);
  } catch {
    notFound();
  }

  const companyMeta = await resolveCompanyByCik(cik);
  const [timeline, insider, outstandingShares, financialTrends] = await Promise.all([
    buildCompanyTimeline(cik, page.filings, page.info.fiscalYearEnd),
    fetchInsiderTransactions(cik).catch(() => null),
    fetchOutstandingShares(cik),
    fetchFinancialTrends(cik).catch(() => null),
  ]);
  await recordCompanyView(page, companyMeta);
  const insiderUrl = `#insider-transactions`;

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            ← Edgar Review
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/watchlist" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Watchlist
            </Link>
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Financial modeling workspace
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <CompanyInfoCard
          info={page.info}
          secUrl={page.secUrl}
          insiderUrl={insider ? insiderUrl : undefined}
          ticker={companyMeta?.ticker || undefined}
        />
        <CompanyDataTabs
          cik={page.cik}
          companyName={page.info.name}
          ticker={companyMeta?.ticker || undefined}
          timeline={timeline}
          fiscalYearEnd={page.info.fiscalYearEnd}
          filings={page.filings}
          totalShown={page.totalShown}
          insider={insider}
          outstandingShares={outstandingShares}
          financialTrends={financialTrends}
        />
      </main>
    </div>
  );
}
