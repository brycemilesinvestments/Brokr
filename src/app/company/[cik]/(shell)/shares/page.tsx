import { notFound } from "next/navigation";
import { fetchOutstandingShares } from "@/routes/company/[cik]/features/outstanding-shares/lib/fetch-outstanding-shares";
import { SharesPageContent } from "@/routes/company/[cik]/components/shares-page-content/shares-page-content";

type PageProps = {
  params: Promise<{ cik: string }>;
};

export default async function SharesPage({ params }: PageProps) {
  const { cik } = await params;
  const points = await fetchOutstandingShares(cik).catch(() => null);
  if (!points) notFound();

  return <SharesPageContent points={points} />;
}
