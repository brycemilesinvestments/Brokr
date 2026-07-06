import { fetchSec, submissionsUrl } from "@/lib/edgar";
import type { SubmissionFilingMeta } from "@/routes/company/[cik]/features/filings/types";

type SecSubmissionsResponse = {
  filings: {
    recent: {
      accessionNumber: string[];
      form: string[];
      filingDate: string[];
      reportDate: string[];
      primaryDocument: string[];
    };
  };
};

{ submissionsUrl };

export async function fetchSubmissionMetadata(
  cik: string | number,
): Promise<Map<string, SubmissionFilingMeta>> {
  const url = submissionsUrl(cik);
  const response = await fetchSec(url, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return new Map();
  }

  const data = (await response.json()) as SecSubmissionsResponse;
  const recent = data.filings?.recent;
  if (!recent) return new Map();

  const map = new Map<string, SubmissionFilingMeta>();
  const count = recent.accessionNumber.length;

  for (let i = 0; i < count; i++) {
    const accessionNumber = recent.accessionNumber[i];
    map.set(accessionNumber, {
      accessionNumber,
      form: recent.form[i],
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate[i] ?? "",
      primaryDocument: recent.primaryDocument[i] ?? "",
    });
  }

  return map;
}
