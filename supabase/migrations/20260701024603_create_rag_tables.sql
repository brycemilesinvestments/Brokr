create extension if not exists vector with schema extensions;

create table if not exists public.filing_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  accession text not null,
  section_type text not null,
  period_end text,
  chunk_index integer not null,
  text text not null,
  embedding extensions.vector(384) not null,
  token_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, accession, section_type, chunk_index)
);

create index if not exists filing_chunks_company_id_idx
  on public.filing_chunks (company_id);

create index if not exists filing_chunks_accession_idx
  on public.filing_chunks (accession);

create index if not exists filing_chunks_embedding_idx
  on public.filing_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

create table if not exists public.structured_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  metric_name text not null,
  display_name text not null,
  period_end text not null,
  fp text,
  fy integer,
  value numeric not null,
  unit text,
  accession text,
  indexed_at timestamptz not null default now(),
  unique (company_id, metric_name, period_end, fp)
);

create index if not exists structured_metrics_company_id_idx
  on public.structured_metrics (company_id);

create index if not exists structured_metrics_lookup_idx
  on public.structured_metrics (company_id, metric_name, period_end);

create table if not exists public.filing_ingest_status (
  company_id text not null,
  accession text not null,
  chunks_done boolean not null default false,
  embedded_done boolean not null default false,
  structured_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (company_id, accession)
);

alter table public.filing_chunks enable row level security;
alter table public.structured_metrics enable row level security;
alter table public.filing_ingest_status enable row level security;

create policy "Allow public read on filing_chunks"
  on public.filing_chunks for select using (true);

create policy "Authenticated users can insert on filing_chunks"
  on public.filing_chunks for insert with check (auth.uid() is not null);

create policy "Authenticated users can delete on filing_chunks"
  on public.filing_chunks for delete using (auth.uid() is not null);

create policy "Allow public read on structured_metrics"
  on public.structured_metrics for select using (true);

create policy "Authenticated users can insert on structured_metrics"
  on public.structured_metrics for insert with check (auth.uid() is not null);

create policy "Authenticated users can delete on structured_metrics"
  on public.structured_metrics for delete using (auth.uid() is not null);

create policy "Allow public read on filing_ingest_status"
  on public.filing_ingest_status for select using (true);

create policy "Authenticated users can insert on filing_ingest_status"
  on public.filing_ingest_status for insert with check (auth.uid() is not null);

create policy "Authenticated users can update on filing_ingest_status"
  on public.filing_ingest_status for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create or replace function public.match_filing_chunks(
  query_embedding extensions.vector(384),
  match_company_id text,
  match_count integer default 8,
  match_period_end text default null
)
returns table (
  id uuid,
  company_id text,
  accession text,
  section_type text,
  period_end text,
  chunk_index integer,
  text text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    fc.id,
    fc.company_id,
    fc.accession,
    fc.section_type,
    fc.period_end,
    fc.chunk_index,
    fc.text,
    1 - (fc.embedding <=> query_embedding) as similarity
  from public.filing_chunks fc
  where fc.company_id = match_company_id
    and (match_period_end is null or fc.period_end = match_period_end)
  order by fc.embedding <=> query_embedding
  limit match_count;
$$;
