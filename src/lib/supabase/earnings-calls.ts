import { createAdminClient } from "@/lib/supabase/admin";

export type EarningsCallCandidateRef = {
  sourceUrl: string;
  sourceType: "sec_exhibit" | "ir_site";
  title?: string;
  eventDate?: string;
  fiscalPeriod?: string;
  linked8kAccession?: string;
};

export type EarningsCallTranscriptRow = {
  id: number;
  company_id: number | null;
  issuer_cik: string;
  source_url: string;
  source_type: "sec_exhibit" | "ir_site";
  event_date: string | null;
  fiscal_period: string | null;
  linked_8k_accession: string | null;
  title: string | null;
  plain_text: string;
  char_count: number;
  raw_html_path: string | null;
  synthetic_accession: string;
  embedded_at: string | null;
  scrape_error: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertEarningsCallTranscriptInput = {
  companyId: number;
  issuerCik: string;
  candidate: EarningsCallCandidateRef;
  syntheticAccession: string;
  plainText: string;
  charCount: number;
  rawHtmlPath?: string | null;
  embeddedAt?: string | null;
  scrapeError?: string | null;
};

export type EarningsCallTranscriptStore = {
  findBySourceUrl(issuerCik: string, sourceUrl: string): Promise<EarningsCallTranscriptRow | null>;
  listByIssuerCik(issuerCik: string): Promise<EarningsCallTranscriptRow[]>;
  upsert(input: UpsertEarningsCallTranscriptInput): Promise<EarningsCallTranscriptRow>;
};

export class MemoryEarningsCallTranscriptStore implements EarningsCallTranscriptStore {
  private rows = new Map<string, EarningsCallTranscriptRow>();
  private nextId = 1;

  private key(issuerCik: string, sourceUrl: string) {
    return `${issuerCik}:${sourceUrl}`;
  }

  async findBySourceUrl(issuerCik: string, sourceUrl: string) {
    return this.rows.get(this.key(issuerCik, sourceUrl)) ?? null;
  }

  async listByIssuerCik(issuerCik: string) {
    return [...this.rows.values()]
      .filter((row) => row.issuer_cik === issuerCik)
      .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
  }

  async upsert(input: UpsertEarningsCallTranscriptInput) {
    const existing = this.rows.get(this.key(input.issuerCik, input.candidate.sourceUrl));
    const now = new Date().toISOString();
    const row: EarningsCallTranscriptRow = {
      id: existing?.id ?? this.nextId++,
      company_id: input.companyId,
      issuer_cik: input.issuerCik,
      source_url: input.candidate.sourceUrl,
      source_type: input.candidate.sourceType,
      event_date: input.candidate.eventDate ?? null,
      fiscal_period: input.candidate.fiscalPeriod ?? null,
      linked_8k_accession: input.candidate.linked8kAccession ?? null,
      title: input.candidate.title ?? null,
      plain_text: input.plainText,
      char_count: input.charCount,
      raw_html_path: input.rawHtmlPath ?? null,
      synthetic_accession: input.syntheticAccession,
      embedded_at: input.embeddedAt ?? existing?.embedded_at ?? null,
      scrape_error: input.scrapeError ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.rows.set(this.key(input.issuerCik, input.candidate.sourceUrl), row);
    return row;
  }
}

function mapRow(row: Record<string, unknown>): EarningsCallTranscriptRow {
  return {
    id: Number(row.id),
    company_id: row.company_id === null ? null : Number(row.company_id),
    issuer_cik: String(row.issuer_cik),
    source_url: String(row.source_url),
    source_type: row.source_type as EarningsCallTranscriptRow["source_type"],
    event_date: row.event_date ? String(row.event_date) : null,
    fiscal_period: row.fiscal_period ? String(row.fiscal_period) : null,
    linked_8k_accession: row.linked_8k_accession ? String(row.linked_8k_accession) : null,
    title: row.title ? String(row.title) : null,
    plain_text: String(row.plain_text),
    char_count: Number(row.char_count),
    raw_html_path: row.raw_html_path ? String(row.raw_html_path) : null,
    synthetic_accession: String(row.synthetic_accession),
    embedded_at: row.embedded_at ? String(row.embedded_at) : null,
    scrape_error: row.scrape_error ? String(row.scrape_error) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function createSupabaseEarningsCallStore(): EarningsCallTranscriptStore | null {
  const supabase = createAdminClient();
  if (!supabase) return null;

  return {
    async findBySourceUrl(issuerCik, sourceUrl) {
      const { data, error } = await supabase
        .from("earnings_call_transcripts")
        .select("*")
        .eq("issuer_cik", issuerCik)
        .eq("source_url", sourceUrl)
        .maybeSingle();

      if (error) {
        throw new Error(`earnings_call_transcripts lookup failed: ${error.message}`);
      }
      return data ? mapRow(data) : null;
    },

    async listByIssuerCik(issuerCik) {
      const { data, error } = await supabase
        .from("earnings_call_transcripts")
        .select("*")
        .eq("issuer_cik", issuerCik)
        .order("event_date", { ascending: false });

      if (error) {
        throw new Error(`earnings_call_transcripts list failed: ${error.message}`);
      }
      return (data ?? []).map(mapRow);
    },

    async upsert(input) {
      const payload = {
        company_id: input.companyId,
        issuer_cik: input.issuerCik,
        source_url: input.candidate.sourceUrl,
        source_type: input.candidate.sourceType,
        event_date: input.candidate.eventDate ?? null,
        fiscal_period: input.candidate.fiscalPeriod ?? null,
        linked_8k_accession: input.candidate.linked8kAccession ?? null,
        title: input.candidate.title ?? null,
        plain_text: input.plainText,
        char_count: input.charCount,
        raw_html_path: input.rawHtmlPath ?? null,
        synthetic_accession: input.syntheticAccession,
        embedded_at: input.embeddedAt ?? null,
        scrape_error: input.scrapeError ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("earnings_call_transcripts")
        .upsert(payload, { onConflict: "issuer_cik,source_url" })
        .select("*")
        .single();

      if (error) {
        throw new Error(`earnings_call_transcripts upsert failed: ${error.message}`);
      }
      return mapRow(data);
    },
  };
}
