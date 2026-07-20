import { EDGAR_BUCKET } from "@/lib/edgar/client";
import { discoverTranscriptCandidates } from "@/lib/earnings-calls/discover-transcripts";
import { ingestTranscript } from "@/lib/earnings-calls/ingest-transcript";
import { buildSyntheticAccession, scrapeTranscript } from "@/lib/earnings-calls/scrape-transcript";
import type { EarningsCallScrapeResult, TranscriptCandidate } from "@/lib/earnings-calls/types";
import type { ChunkStore } from "@/lib/rag/store/chunk-store";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseEarningsCallStore,
  type EarningsCallTranscriptStore,
} from "@/lib/supabase/earnings-calls";
import type { CompanyRow } from "@/lib/supabase/companies";

function isEmbedded(
  ingest: { chunksStored: number; skippedDuplicate: boolean },
): boolean {
  return ingest.chunksStored > 0 || ingest.skippedDuplicate;
}

async function storeRawHtml(
  company: CompanyRow,
  syntheticAccession: string,
  html: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const path = `documents/earnings-calls/${company.id}/${syntheticAccession}.html`;
  const { error } = await supabase.storage.from(EDGAR_BUCKET).upload(path, html, {
    contentType: "text/html",
    upsert: true,
  });

  if (error) return null;
  return path;
}

export async function runEarningsCallScrape(
  company: CompanyRow,
  options: {
    filings: Parameters<typeof discoverTranscriptCandidates>[0]["filings"];
    limit?: number;
    store?: EarningsCallTranscriptStore;
    chunkStore?: ChunkStore;
    force?: boolean;
    candidates?: TranscriptCandidate[];
  },
): Promise<EarningsCallScrapeResult> {
  const store = options.store ?? createSupabaseEarningsCallStore();
  const limit = options.limit ?? 10;

  const candidates =
    options.candidates ??
    (await discoverTranscriptCandidates({
      cik: company.edgar_id,
      filings: options.filings,
      limit,
    }));

  const result: EarningsCallScrapeResult = {
    cik: company.edgar_id,
    companyId: company.id,
    discovered: candidates.length,
    scraped: 0,
    embedded: 0,
    skipped: 0,
    failures: [],
    transcripts: [],
  };

  if (!store) {
    result.failures.push({
      sourceUrl: "*",
      error: "No earnings call transcript store configured",
    });
    return result;
  }

  for (const candidate of candidates) {
    const syntheticAccession = buildSyntheticAccession(candidate.sourceUrl);
    const existing = await store.findBySourceUrl(company.edgar_id, candidate.sourceUrl);

    if (existing && existing.char_count > 0 && existing.plain_text && !options.force) {
      if (existing.embedded_at) {
        result.skipped += 1;
        result.transcripts.push({
          sourceUrl: existing.source_url,
          syntheticAccession: existing.synthetic_accession,
          eventDate: existing.event_date ?? undefined,
          title: existing.title ?? undefined,
          charCount: existing.char_count,
          embedded: true,
        });
        continue;
      }

      const ingest = await ingestTranscript({
        company,
        syntheticAccession: existing.synthetic_accession,
        plainText: existing.plain_text,
        eventDate: existing.event_date,
        store: options.chunkStore,
      });

      const embeddedAt = isEmbedded(ingest) ? new Date().toISOString() : null;
      await store.upsert({
        companyId: company.id,
        issuerCik: company.edgar_id,
        candidate: {
          sourceUrl: existing.source_url,
          sourceType: existing.source_type,
          title: existing.title ?? undefined,
          eventDate: existing.event_date ?? undefined,
          fiscalPeriod: existing.fiscal_period ?? undefined,
          linked8kAccession: existing.linked_8k_accession ?? undefined,
        },
        syntheticAccession: existing.synthetic_accession,
        plainText: existing.plain_text,
        charCount: existing.char_count,
        rawHtmlPath: existing.raw_html_path,
        embeddedAt,
      });

      result.skipped += 1;
      if (isEmbedded(ingest)) result.embedded += 1;
      result.transcripts.push({
        sourceUrl: existing.source_url,
        syntheticAccession: existing.synthetic_accession,
        eventDate: existing.event_date ?? undefined,
        title: existing.title ?? undefined,
        charCount: existing.char_count,
        embedded: Boolean(embeddedAt),
      });
      continue;
    }

    try {
      const scraped = await scrapeTranscript({
        sourceUrl: candidate.sourceUrl,
        title: candidate.title,
      });

      const rawHtmlPath = scraped.html
        ? await storeRawHtml(company, syntheticAccession, scraped.html)
        : null;

      const ingest = await ingestTranscript({
        company,
        syntheticAccession,
        plainText: scraped.plainText,
        eventDate: candidate.eventDate ?? null,
        store: options.chunkStore,
      });

      const embeddedAt = isEmbedded(ingest) ? new Date().toISOString() : null;
      await store.upsert({
        companyId: company.id,
        issuerCik: company.edgar_id,
        candidate: {
          ...candidate,
          sourceUrl: scraped.sourceUrl,
        },
        syntheticAccession,
        plainText: scraped.plainText,
        charCount: scraped.charCount,
        rawHtmlPath,
        embeddedAt,
      });

      result.scraped += 1;
      if (isEmbedded(ingest)) result.embedded += 1;
      result.transcripts.push({
        sourceUrl: scraped.sourceUrl,
        syntheticAccession,
        eventDate: candidate.eventDate,
        title: candidate.title,
        charCount: scraped.charCount,
        embedded: Boolean(embeddedAt),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failures.push({ sourceUrl: candidate.sourceUrl, error: message });
      if (existing?.plain_text) {
        await store.upsert({
          companyId: company.id,
          issuerCik: company.edgar_id,
          candidate,
          syntheticAccession,
          plainText: existing.plain_text,
          charCount: existing.char_count,
          scrapeError: message,
        });
      }
    }
  }

  return result;
}
