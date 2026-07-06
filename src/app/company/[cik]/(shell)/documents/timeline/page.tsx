import { notFound } from "next/navigation";
import { DocumentsPageContent } from "@/routes/company/[cik]/components/documents-page-content/documents-page-content";
import { fetchDocumentsPageData } from "@/routes/company/[cik]/lib/fetch-documents-page-data";

type PageProps = {
  params: Promise<{ cik: string }>;
};

export default async function DocumentsTimelinePage({ params }: PageProps) {
  const { cik } = await params;
  const data = await fetchDocumentsPageData(cik);
  if (!data) notFound();

  return <DocumentsPageContent {...data} view="timeline" />;
}
