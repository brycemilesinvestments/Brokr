import Link from "next/link";
import { notFound } from "next/navigation";
import { FilingDetail } from "@/routes/company/[cik]/filing/[accession]";
import { fetchFilingDetail } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-detail";
import { fetchFilingDiscovery } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-discovery";
import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";

type PageProps = {
  params: Promise<{ cik: string; accession: string }>;
};

export default async function FilingPage({ params }: PageProps) {
  const { cik, accession } = await params;
  const accessionNumber = decodeURIComponent(accession);

  const filing = await fetchFilingDetail(cik, accessionNumber).catch(() => null);
  if (!filing) notFound();

  const [companyMeta, discovery] = await Promise.all([
    resolveCompanyByCik(cik),
    fetchFilingDiscovery(filing).catch(() => undefined),
  ]);

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            ← Edgar Review
          </Link>
          <Link
            href={`/company/${cik}`}
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            {companyMeta?.title ?? `CIK ${cik}`}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <FilingDetail filing={filing} companyName={companyMeta?.title} discovery={discovery} />
      </main>
    </div>
  );
}
