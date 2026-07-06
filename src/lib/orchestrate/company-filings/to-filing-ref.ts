import { formatCik } from "@/lib/edgar/constants";
import type { FilingRef } from "@/lib/edgar/types";

export type StoreableFilingInput = {
  accessionNumber: string;
  formType: string;
  filingDate: string;
  reportDate?: string | null;
  items?: string | null;
  primaryDocument?: string | null;
};

export function toFilingRef(cik: string, filing: StoreableFilingInput): FilingRef {
  return {
    cik: formatCik(cik),
    accessionNumber: filing.accessionNumber,
    form: filing.formType,
    filingDate: filing.filingDate,
    reportDate: filing.reportDate ?? undefined,
    items: filing.items ?? undefined,
    primaryDocument: filing.primaryDocument ?? undefined,
  };
}

export function documentToFilingRef(companyEdgarId: string, document: {
  accession_number: string;
  form_type: string;
  filing_date: string;
  report_date: string | null;
  items: string | null;
  primary_document: string | null;
}): FilingRef {
  return {
    cik: formatCik(companyEdgarId),
    accessionNumber: document.accession_number,
    form: document.form_type,
    filingDate: document.filing_date,
    reportDate: document.report_date ?? undefined,
    items: document.items ?? undefined,
    primaryDocument: document.primary_document ?? undefined,
  };
}
