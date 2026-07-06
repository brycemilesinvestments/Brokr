import { createAdminClient } from "@/lib/supabase/admin";
import type { ClassifiedTransactionRow } from "@/lib/orchestrate/form-345/types";
import {
  mapForm345TransactionRow,
  type Form345TransactionRow,
} from "@/lib/supabase/form345-transaction-row";

export type { Form345TransactionRow } from "@/lib/supabase/form345-transaction-row";

export type FootnoteClassificationRow = {
  footnote_hash: string;
  normalized_text: string;
  classification: string;
  citation_matched: string | null;
  requires_date_extraction: boolean;
  classification_tier: number;
  ai_model_used: string | null;
  ai_classification_text: string | null;
  created_at: string;
};

export type Form345FilingProcessedRow = {
  accession_number: string;
  company_id: number | null;
  form_type: string;
  filed_date: string;
  issuer_cik: string;
  raw_xml_path: string | null;
  parse_errors: Record<string, unknown> | null;
  processed_at: string;
};

function mapFootnoteRow(row: Record<string, unknown>): FootnoteClassificationRow {
  return {
    footnote_hash: String(row.footnote_hash),
    normalized_text: String(row.normalized_text),
    classification: String(row.classification),
    citation_matched: (row.citation_matched as string | null) ?? null,
    requires_date_extraction: Boolean(row.requires_date_extraction),
    classification_tier: Number(row.classification_tier),
    ai_model_used: (row.ai_model_used as string | null) ?? null,
    ai_classification_text: (row.ai_classification_text as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function getFootnoteClassification(
  footnoteHash: string,
): Promise<FootnoteClassificationRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("footnote_classifications")
    .select("*")
    .eq("footnote_hash", footnoteHash)
    .maybeSingle();

  if (error) {
    throw new Error(`footnote_classifications lookup failed: ${error.message}`);
  }

  return data ? mapFootnoteRow(data) : null;
}

export type FootnoteClassificationInput = {
  footnoteHash: string;
  normalizedText: string;
  classification: string;
  citationMatched: string | null;
  requiresDateExtraction: boolean;
  classificationTier: 2 | 3;
  aiModelUsed?: string | null;
  aiClassificationText?: string | null;
};

export async function upsertFootnoteClassification(
  input: FootnoteClassificationInput,
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required for footnote cache writes");
  }

  const { error } = await supabase.from("footnote_classifications").upsert(
    {
      footnote_hash: input.footnoteHash,
      normalized_text: input.normalizedText,
      classification: input.classification,
      citation_matched: input.citationMatched,
      requires_date_extraction: input.requiresDateExtraction,
      classification_tier: input.classificationTier,
      ai_model_used: input.aiModelUsed ?? null,
      ai_classification_text: input.aiClassificationText ?? null,
    },
    { onConflict: "footnote_hash", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`footnote_classifications upsert failed: ${error.message}`);
  }
}

export async function isForm345FilingProcessed(accessionNumber: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("form345_filings_processed")
    .select("accession_number")
    .eq("accession_number", accessionNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`form345_filings_processed lookup failed: ${error.message}`);
  }

  return Boolean(data);
}

export async function markForm345FilingProcessed(input: {
  accessionNumber: string;
  companyId?: number | null;
  formType: string;
  filedDate: string;
  issuerCik: string;
  rawXmlPath?: string | null;
  parseErrors?: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required to mark filings processed");
  }

  const { error } = await supabase.from("form345_filings_processed").upsert(
    {
      accession_number: input.accessionNumber,
      company_id: input.companyId ?? null,
      form_type: input.formType,
      filed_date: input.filedDate,
      issuer_cik: input.issuerCik,
      raw_xml_path: input.rawXmlPath ?? null,
      parse_errors: input.parseErrors ?? null,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "accession_number", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`form345_filings_processed upsert failed: ${error.message}`);
  }
}

export async function insertForm345Transactions(
  accessionNumber: string,
  rows: ClassifiedTransactionRow[],
): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required to insert transactions");
  }

  if (rows.length === 0) return 0;

  const payload = rows.map((row) => ({
    accession_number: accessionNumber,
    line_index: row.lineIndex,
    issuer_cik: row.issuerCik,
    issuer_name: row.issuerName,
    ticker: row.ticker,
    reporting_owner_name: row.reportingOwnerName,
    reporting_owner_cik: row.reportingOwnerCik,
    is_director: row.isDirector,
    is_officer: row.isOfficer,
    is_ten_pct_owner: row.isTenPctOwner,
    is_other: row.isOther,
    officer_title: row.officerTitle,
    security_title: row.securityTitle,
    is_derivative: row.isDerivative,
    transaction_code: row.transactionCode,
    transaction_date: row.transactionDate,
    is_10b5_1_checkbox: row.is10b51Checkbox,
    shares_amount: row.sharesAmount,
    acquired_or_disposed: row.acquiredOrDisposed,
    price_per_share: row.pricePerShare,
    shares_owned_following: row.sharesOwnedFollowing,
    ownership_form: row.ownershipForm,
    nature_of_indirect_ownership: row.natureOfIndirectOwnership,
    footnote_raw_text: row.footnoteRawText,
    footnote_hash: row.footnoteHash,
    footnote_citation_matched: row.footnoteCitationMatched,
    footnote_classification: row.footnoteClassification,
    plan_adoption_date: row.planAdoptionDate,
    classification_tier: row.classificationTier,
    needs_ai_review: row.needsAiReview,
    ai_model_used: row.aiModelUsed,
    ai_classification_text: row.aiClassificationText,
    vesting_event_id: row.vestingEventId,
  }));

  const { error } = await supabase.from("form345_transactions").upsert(payload, {
    onConflict: "accession_number,line_index",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(`form345_transactions insert failed: ${error.message}`);
  }

  return rows.length;
}

export async function logForm345ParseReview(input: {
  accessionNumber: string;
  elementPath?: string;
  message: string;
  rawFragment?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  await supabase.from("form345_parse_review_log").insert({
    accession_number: input.accessionNumber,
    element_path: input.elementPath ?? null,
    message: input.message,
    raw_fragment: input.rawFragment ?? null,
  });
}

function normalizeIssuerCik(cik: string): string {
  return cik.replace(/\D/g, "").padStart(10, "0");
}

export async function countForm345TransactionsByIssuerCik(cik: string): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const issuerCik = normalizeIssuerCik(cik);
  const { count, error } = await supabase
    .from("form345_transactions")
    .select("id", { count: "exact", head: true })
    .eq("issuer_cik", issuerCik);

  if (error) {
    throw new Error(`form345_transactions count failed: ${error.message}`);
  }

  return count ?? 0;
}

export async function listForm345TransactionsByIssuerCik(
  cik: string,
  limit = 500,
): Promise<Form345TransactionRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const issuerCik = normalizeIssuerCik(cik);
  const { data, error } = await supabase
    .from("form345_transactions")
    .select("*")
    .eq("issuer_cik", issuerCik)
    .order("transaction_date", { ascending: false, nullsFirst: false })
    .order("line_index", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`form345_transactions list failed: ${error.message}`);
  }

  const transactions = data ?? [];
  if (transactions.length === 0) return [];

  const accessions = [...new Set(transactions.map((row) => String(row.accession_number)))];
  const { data: filings, error: filingsError } = await supabase
    .from("form345_filings_processed")
    .select("accession_number, filed_date")
    .in("accession_number", accessions);

  if (filingsError) {
    throw new Error(`form345_filings_processed lookup failed: ${filingsError.message}`);
  }

  const filedDateByAccession = new Map(
    (filings ?? []).map((filing) => [String(filing.accession_number), String(filing.filed_date)]),
  );

  return transactions.map((row) => {
    const mapped = mapForm345TransactionRow(row as Record<string, unknown>);
    return {
      ...mapped,
      filed_date: filedDateByAccession.get(mapped.accession_number) ?? null,
    };
  });
}

export async function getForm345ProcessedStatus(
  accessions: string[],
): Promise<Record<string, { processed: boolean }>> {
  const supabase = createAdminClient();
  const status: Record<string, { processed: boolean }> = {};

  for (const accession of accessions) {
    status[accession] = { processed: false };
  }

  if (!supabase || accessions.length === 0) {
    return status;
  }

  const { data, error } = await supabase
    .from("form345_filings_processed")
    .select("accession_number")
    .in("accession_number", accessions);

  if (error) {
    throw new Error(`form345_filings_processed status failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    status[String(row.accession_number)] = { processed: true };
  }

  return status;
}
