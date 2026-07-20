import { filingDocumentUrl } from "@/lib/edgar/constants";
import { filingIndexJsonUrl } from "@/lib/edgar/endpoints";
import { fetchSec } from "@/lib/edgar/sec-request";
import { TRANSCRIPT_FILENAME_PATTERN } from "@/lib/earnings-calls/constants";
import type { TranscriptCandidate } from "@/lib/earnings-calls/types";
import { find_earnings_8k } from "@/lib/guidance/find_earnings_8k";

type FilingIndexItem = {
  name?: string;
  type?: string;
  size?: string;
  description?: string;
};

function normalizeIndexItems(raw: unknown): FilingIndexItem[] {
  if (!raw || typeof raw !== "object") return [];
  const directory = (raw as Record<string, unknown>).directory;
  if (!directory || typeof directory !== "object") return [];

  const item = (directory as Record<string, unknown>).item;
  if (!item) return [];
  return Array.isArray(item) ? (item as FilingIndexItem[]) : [item as FilingIndexItem];
}

function filingLabel(item: FilingIndexItem): string {
  return [item.description, item.name, item.type].filter(Boolean).join(" ");
}

function isTranscriptDocument(item: FilingIndexItem): boolean {
  const label = filingLabel(item);
  if (!TRANSCRIPT_FILENAME_PATTERN.test(label)) return false;
  if (!/\.(htm|html|txt)$/i.test(item.name ?? "")) return false;
  return true;
}

export function pickTranscriptDocumentsFromItems(
  items: FilingIndexItem[],
): FilingIndexItem[] {
  return items.filter(isTranscriptDocument);
}

async function fetchFilingIndexItems(
  cik: string,
  accessionNumber: string,
): Promise<FilingIndexItem[]> {
  const response = await fetchSec(filingIndexJsonUrl(cik, accessionNumber), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const json = (await response.json()) as Record<string, unknown>;
  return normalizeIndexItems(json);
}

export type DiscoverTranscriptsFromSecInput = {
  cik: string;
  filings: Array<{
    accessionNumber: string;
    form: string;
    filingDate: string;
    reportDate?: string;
    primaryDocument?: string;
    items?: string;
  }>;
};

/**
 * Discover transcript HTML documents attached to earnings-related 8-K filings.
 */
export async function discoverTranscriptsFromSec(
  cik: string,
  filings: DiscoverTranscriptsFromSecInput["filings"],
  limit = 12,
): Promise<TranscriptCandidate[]> {
  const earningsFilings = find_earnings_8k(
    filings.map((filing) => ({
      cik,
      accessionNumber: filing.accessionNumber,
      form: filing.form,
      filingDate: filing.filingDate,
      reportDate: filing.reportDate,
      primaryDocument: filing.primaryDocument,
      items: filing.items,
    })),
  ).slice(0, limit);

  const candidates: TranscriptCandidate[] = [];

  for (const filing of earningsFilings) {
    const items = await fetchFilingIndexItems(cik, filing.accessionNumber);
    const transcriptDocs = pickTranscriptDocumentsFromItems(items);

    for (const doc of transcriptDocs) {
      const filename = doc.name?.trim();
      if (!filename) continue;

      candidates.push({
        sourceUrl: filingDocumentUrl(cik, filing.accessionNumber, filename),
        sourceType: "sec_exhibit",
        title: doc.description ?? filename,
        eventDate: filing.reportDate ?? filing.filingDate,
        linked8kAccession: filing.accessionNumber,
        score: 5,
        reasons: ["sec_earnings_8k_exhibit", "filename_matches_transcript"],
      });
    }
  }

  return candidates;
}
