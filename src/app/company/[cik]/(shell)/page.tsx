import { redirect } from "next/navigation";
import { companyAnalysisPath } from "@/routes/company/[cik]/lib/company-tab-paths";

type PageProps = {
  params: Promise<{ cik: string }>;
};

export default async function CompanyIndexPage({ params }: PageProps) {
  const { cik } = await params;
  redirect(companyAnalysisPath(cik));
}
