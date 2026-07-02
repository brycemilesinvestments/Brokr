import { formatFormStorageDate } from "@/lib/orchestrate/form-8k/paths";

export { EDGAR_BUCKET } from "@/lib/orchestrate/form-8k/paths";

export function form10kReportDate(filing: { reportDate?: string; filingDate: string }): string {
  return filing.reportDate || filing.filingDate;
}

export function form10kStoragePath(companyId: number, reportDate: string): string {
  const formatted = formatFormStorageDate(reportDate);
  return `documents/10-K/${companyId}/10-K ${formatted}.htm`;
}

export const FORM10K_ANALYSIS_TYPE = "form_10k_analysis";
