import { notFound, redirect } from "next/navigation";
import { DocumentsPageContent } from "@/routes/company/[cik]/components/documents-page-content/documents-page-content";
import { documentsPagePath } from "@/routes/company/[cik]/lib/company-tab-paths";
import { fetchDocumentsPageData } from "@/routes/company/[cik]/lib/fetch-documents-page-data";

type PageProps = {
  params: Promise<{ cik: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function DocumentsListPage({ params, searchParams }: PageProps) {
  const { cik } = await params;
  const { view } = await searchParams;

  if (view === "timeline") {
    redirect(documentsPagePath(cik, "timeline"));
  }

  const data = await fetchDocumentsPageData(cik);
  if (!data) notFound();

  return <DocumentsPageContent {...data} view="list" />;
}
