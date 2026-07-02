import { fetchSubmissionMetadata } from "./fetch-submissions";
import { buildCoreFourTimeline } from "./timeline";
import type { Filing } from "@/routes/company/[cik]/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

export async function buildCompanyTimeline(
  cik: string,
  filings: Filing[],
  fiscalYearEnd?: string,
): Promise<TimelineFiling[]> {
  const submissions = await fetchSubmissionMetadata(cik);

  const reportDatesByAccession = new Map<string, string>();
  for (const [accession, meta] of submissions) {
    if (meta.reportDate) {
      reportDatesByAccession.set(accession, meta.reportDate);
    }
  }

  return buildCoreFourTimeline(filings, {
    reportDatesByAccession,
    fiscalYearEnd,
  });
}
