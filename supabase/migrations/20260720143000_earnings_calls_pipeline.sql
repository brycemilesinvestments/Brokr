-- Earnings call transcript scraping + embedding pipeline

create table if not exists public.earnings_call_transcripts (
  id bigint generated always as identity primary key,
  company_id bigint references public.companies (id) on delete cascade,
  issuer_cik text not null,
  source_url text not null,
  source_type text not null check (source_type in ('sec_exhibit', 'ir_site')),
  event_date date,
  fiscal_period text,
  linked_8k_accession text,
  title text,
  plain_text text not null,
  char_count integer not null default 0,
  raw_html_path text,
  synthetic_accession text not null,
  embedded_at timestamptz,
  scrape_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint earnings_call_transcripts_source_url_key unique (issuer_cik, source_url),
  constraint earnings_call_transcripts_synthetic_accession_key unique (synthetic_accession)
);

create index if not exists earnings_call_transcripts_company_id_idx
  on public.earnings_call_transcripts (company_id);

create index if not exists earnings_call_transcripts_issuer_cik_idx
  on public.earnings_call_transcripts (issuer_cik);

create index if not exists earnings_call_transcripts_event_date_idx
  on public.earnings_call_transcripts (event_date desc);

alter table public.earnings_call_transcripts enable row level security;

create policy "Allow public read on earnings_call_transcripts"
  on public.earnings_call_transcripts for select using (true);

create policy "Authenticated users can insert on earnings_call_transcripts"
  on public.earnings_call_transcripts for insert with check (auth.uid() is not null);

create policy "Authenticated users can update on earnings_call_transcripts"
  on public.earnings_call_transcripts for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
