-- Form 3/4/5 insider ownership ingestion pipeline

create table if not exists public.footnote_classifications (
  footnote_hash text primary key,
  normalized_text text not null,
  classification text not null,
  citation_matched text,
  requires_date_extraction boolean not null default false,
  classification_tier smallint not null check (classification_tier in (2, 3)),
  ai_model_used text,
  ai_classification_text text,
  created_at timestamptz not null default now()
);

create index if not exists footnote_classifications_classification_idx
  on public.footnote_classifications (classification);

create table if not exists public.form345_filings_processed (
  accession_number text primary key,
  company_id bigint references public.companies (id) on delete set null,
  form_type text not null,
  filed_date date not null,
  issuer_cik text not null,
  raw_xml_path text,
  parse_errors jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists form345_filings_processed_company_id_idx
  on public.form345_filings_processed (company_id);

create index if not exists form345_filings_processed_issuer_cik_idx
  on public.form345_filings_processed (issuer_cik);

create table if not exists public.form345_transactions (
  id bigint generated always as identity primary key,
  accession_number text not null references public.form345_filings_processed (accession_number) on delete cascade,
  line_index integer not null,
  issuer_cik text not null,
  issuer_name text,
  ticker text,
  reporting_owner_name text not null,
  reporting_owner_cik text,
  is_director boolean,
  is_officer boolean,
  is_ten_pct_owner boolean,
  is_other boolean,
  officer_title text,
  security_title text not null,
  is_derivative boolean not null,
  transaction_code text,
  transaction_date date,
  is_10b5_1_checkbox boolean,
  shares_amount numeric,
  acquired_or_disposed text,
  price_per_share numeric,
  shares_owned_following numeric,
  ownership_form text,
  nature_of_indirect_ownership text,
  footnote_raw_text text,
  footnote_hash text references public.footnote_classifications (footnote_hash),
  footnote_citation_matched text,
  footnote_classification text,
  plan_adoption_date date,
  classification_tier smallint check (classification_tier in (1, 2, 3)),
  needs_ai_review boolean not null default false,
  ai_model_used text,
  ai_classification_text text,
  vesting_event_id uuid,
  created_at timestamptz not null default now(),
  unique (accession_number, line_index)
);

create index if not exists form345_transactions_accession_idx
  on public.form345_transactions (accession_number);

create index if not exists form345_transactions_footnote_hash_idx
  on public.form345_transactions (footnote_hash);

create index if not exists form345_transactions_reporting_owner_idx
  on public.form345_transactions (reporting_owner_cik);

create table if not exists public.form345_parse_review_log (
  id bigint generated always as identity primary key,
  accession_number text not null,
  element_path text,
  message text not null,
  raw_fragment text,
  created_at timestamptz not null default now()
);

create index if not exists form345_parse_review_log_accession_idx
  on public.form345_parse_review_log (accession_number);

alter table public.footnote_classifications enable row level security;
alter table public.form345_filings_processed enable row level security;
alter table public.form345_transactions enable row level security;
alter table public.form345_parse_review_log enable row level security;

create policy "Allow public read on footnote_classifications"
  on public.footnote_classifications for select using (true);

create policy "Authenticated users can insert on footnote_classifications"
  on public.footnote_classifications for insert with check (auth.uid() is not null);

create policy "Allow public read on form345_filings_processed"
  on public.form345_filings_processed for select using (true);

create policy "Authenticated users can insert on form345_filings_processed"
  on public.form345_filings_processed for insert with check (auth.uid() is not null);

create policy "Allow public read on form345_transactions"
  on public.form345_transactions for select using (true);

create policy "Authenticated users can insert on form345_transactions"
  on public.form345_transactions for insert with check (auth.uid() is not null);

create policy "Allow public read on form345_parse_review_log"
  on public.form345_parse_review_log for select using (true);

create policy "Authenticated users can insert on form345_parse_review_log"
  on public.form345_parse_review_log for insert with check (auth.uid() is not null);
