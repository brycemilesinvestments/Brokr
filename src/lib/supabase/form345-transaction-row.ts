export type Form345TransactionRow = {
  id: number;
  accession_number: string;
  line_index: number;
  issuer_cik: string;
  issuer_name: string | null;
  ticker: string | null;
  reporting_owner_name: string;
  reporting_owner_cik: string | null;
  is_director: boolean | null;
  is_officer: boolean | null;
  is_ten_pct_owner: boolean | null;
  is_other: boolean | null;
  officer_title: string | null;
  security_title: string;
  is_derivative: boolean;
  transaction_code: string | null;
  transaction_date: string | null;
  is_10b5_1_checkbox: boolean | null;
  shares_amount: number | null;
  acquired_or_disposed: string | null;
  price_per_share: number | null;
  shares_owned_following: number | null;
  ownership_form: string | null;
  nature_of_indirect_ownership: string | null;
  footnote_raw_text: string | null;
  footnote_hash: string | null;
  footnote_citation_matched: string | null;
  footnote_classification: string | null;
  plan_adoption_date: string | null;
  classification_tier: number | null;
  needs_ai_review: boolean;
  ai_model_used: string | null;
  ai_classification_text: string | null;
  vesting_event_id: string | null;
  filed_date: string | null;
};

export function mapForm345TransactionRow(row: Record<string, unknown>): Form345TransactionRow {
  return {
    id: Number(row.id),
    accession_number: String(row.accession_number),
    line_index: Number(row.line_index),
    issuer_cik: String(row.issuer_cik),
    issuer_name: (row.issuer_name as string | null) ?? null,
    ticker: (row.ticker as string | null) ?? null,
    reporting_owner_name: String(row.reporting_owner_name),
    reporting_owner_cik: (row.reporting_owner_cik as string | null) ?? null,
    is_director: row.is_director == null ? null : Boolean(row.is_director),
    is_officer: row.is_officer == null ? null : Boolean(row.is_officer),
    is_ten_pct_owner: row.is_ten_pct_owner == null ? null : Boolean(row.is_ten_pct_owner),
    is_other: row.is_other == null ? null : Boolean(row.is_other),
    officer_title: (row.officer_title as string | null) ?? null,
    security_title: String(row.security_title),
    is_derivative: Boolean(row.is_derivative),
    transaction_code: (row.transaction_code as string | null) ?? null,
    transaction_date: (row.transaction_date as string | null) ?? null,
    is_10b5_1_checkbox: row.is_10b5_1_checkbox == null ? null : Boolean(row.is_10b5_1_checkbox),
    shares_amount: row.shares_amount != null ? Number(row.shares_amount) : null,
    acquired_or_disposed: (row.acquired_or_disposed as string | null) ?? null,
    price_per_share: row.price_per_share != null ? Number(row.price_per_share) : null,
    shares_owned_following:
      row.shares_owned_following != null ? Number(row.shares_owned_following) : null,
    ownership_form: (row.ownership_form as string | null) ?? null,
    nature_of_indirect_ownership: (row.nature_of_indirect_ownership as string | null) ?? null,
    footnote_raw_text: (row.footnote_raw_text as string | null) ?? null,
    footnote_hash: (row.footnote_hash as string | null) ?? null,
    footnote_citation_matched: (row.footnote_citation_matched as string | null) ?? null,
    footnote_classification: (row.footnote_classification as string | null) ?? null,
    plan_adoption_date: (row.plan_adoption_date as string | null) ?? null,
    classification_tier: row.classification_tier != null ? Number(row.classification_tier) : null,
    needs_ai_review: Boolean(row.needs_ai_review),
    ai_model_used: (row.ai_model_used as string | null) ?? null,
    ai_classification_text: (row.ai_classification_text as string | null) ?? null,
    vesting_event_id: (row.vesting_event_id as string | null) ?? null,
    filed_date: (row.filed_date as string | null) ?? null,
  };
}
