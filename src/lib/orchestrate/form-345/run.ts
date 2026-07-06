import { formatCik } from "@/lib/edgar/constants";
import { fetchSec } from "@/lib/edgar/sec-request";
import { submissionsUrl } from "@/lib/edgar/endpoints";
import { ingestForm345Filing } from "@/lib/orchestrate/form-345/ingest-filing";
import type { IngestForm345BatchResult } from "@/lib/orchestrate/form-345/types";
import { getCompanyByEdgarId } from "@/lib/supabase/companies";

const FORM345_PATTERN = /^(3|4|5)(\/A)?$/;

export type Form345FilingRef = {
  cik: string;
  accessionNumber: string;
  filedDate: string;
  formType: string;
};

export async function discoverForm345Filings(
  cik: string,
  limit = 20,
): Promise<Form345FilingRef[]> {
  const url = submissionsUrl(cik);
  const response = await fetchSec(url, { headers: { Accept: "application/json" } });
  const data = (await response.json()) as {
    filings: {
      recent: {
        form: string[];
        accessionNumber: string[];
        filingDate: string[];
      };
    };
  };

  const recent = data.filings.recent;
  const results: Form345FilingRef[] = [];

  for (let i = 0; i < recent.form.length; i++) {
    if (!FORM345_PATTERN.test(recent.form[i])) continue;
    results.push({
      cik: formatCik(cik),
      accessionNumber: recent.accessionNumber[i],
      filedDate: recent.filingDate[i],
      formType: recent.form[i],
    });
    if (results.length >= limit) break;
  }

  return results;
}

export async function runForm345Ingestion(input: {
  filings: Form345FilingRef[];
}): Promise<IngestForm345BatchResult> {
  const result: IngestForm345BatchResult = {
    filingsProcessed: 0,
    filingsSkipped: 0,
    tier3Calls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    failures: [],
  };

  for (const filing of input.filings) {
    try {
      const company = await getCompanyByEdgarId(formatCik(filing.cik));
      const ingestResult = await ingestForm345Filing({
        cik: filing.cik,
        accessionNumber: filing.accessionNumber,
        filedDate: filing.filedDate,
        companyId: company?.id ?? null,
      });

      if (ingestResult.skipped) {
        result.filingsSkipped += 1;
      } else {
        result.filingsProcessed += 1;
      }

      result.tier3Calls += ingestResult.tier3Calls;
      result.cacheHits += ingestResult.cacheHits;
      result.cacheMisses += ingestResult.cacheMisses;
    } catch (error) {
      result.failures.push({
        accessionNumber: filing.accessionNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export async function runForm345IngestionForCik(
  cik: string,
  options: { limit?: number } = {},
): Promise<IngestForm345BatchResult> {
  const filings = await discoverForm345Filings(cik, options.limit ?? 20);
  return runForm345Ingestion({ filings });
}
