import type { AiClient } from "@/lib/ai";
import {
  classifyOwnershipRows,
  createForm345AiClient,
} from "@/lib/orchestrate/form-345/classify-transaction";
import { detectVestingEventPairs } from "@/lib/orchestrate/form-345/detect-vesting-pairs";
import { fetchRawOwnershipXml } from "@/lib/orchestrate/form-345/fetch-ownership-xml";
import { parseOwnershipXml } from "@/lib/orchestrate/form-345/parse-ownership-xml";
import type { IngestForm345Result } from "@/lib/orchestrate/form-345/types";
import {
  insertForm345Transactions,
  isForm345FilingProcessed,
  logForm345ParseReview,
  markForm345FilingProcessed,
} from "@/lib/supabase/form345";

export type IngestForm345Input = {
  cik: string;
  accessionNumber: string;
  filedDate: string;
  companyId?: number | null;
  ai?: AiClient;
};

export async function ingestForm345Filing(
  input: IngestForm345Input,
): Promise<IngestForm345Result> {
  const alreadyProcessed = await isForm345FilingProcessed(input.accessionNumber);
  if (alreadyProcessed) {
    return {
      accessionNumber: input.accessionNumber,
      skipped: true,
      formType: "4",
      rowsInserted: 0,
      tier3Calls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      parseWarnings: 0,
    };
  }

  const ai = input.ai ?? createForm345AiClient();
  const { xml, filename } = await fetchRawOwnershipXml(input.cik, input.accessionNumber);
  const parsed = parseOwnershipXml(xml);

  for (const warning of parsed.parseWarnings) {
    await logForm345ParseReview({
      accessionNumber: input.accessionNumber,
      elementPath: warning.elementPath,
      message: warning.message,
      rawFragment: warning.rawFragment,
    });
  }

  const { rows: classified, stats } = await classifyOwnershipRows(parsed, { ai });
  const withPairs = detectVestingEventPairs(classified);

  await markForm345FilingProcessed({
    accessionNumber: input.accessionNumber,
    companyId: input.companyId,
    formType: parsed.formType,
    filedDate: input.filedDate,
    issuerCik: parsed.issuerCik,
    rawXmlPath: filename,
    parseErrors:
      parsed.parseWarnings.length > 0
        ? { warnings: parsed.parseWarnings }
        : null,
  });

  const rowsInserted = await insertForm345Transactions(input.accessionNumber, withPairs);

  return {
    accessionNumber: input.accessionNumber,
    skipped: false,
    formType: parsed.formType,
    rowsInserted,
    tier3Calls: stats.tier3Calls,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    parseWarnings: parsed.parseWarnings.length,
  };
}
