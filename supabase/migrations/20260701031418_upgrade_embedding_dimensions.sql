-- Upgrade embedding vectors from 384 to 1024 for voyage-finance-2.
-- Existing vectors are incompatible and must be cleared before the column resize.

drop index if exists public.filing_chunks_embedding_idx;

truncate table public.filing_chunks;

alter table public.filing_chunks
  alter column embedding type extensions.vector(1024);

create index filing_chunks_embedding_idx
  on public.filing_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_filing_chunks(
  query_embedding extensions.vector(1024),
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

-- Ingest flags are stale after truncating chunks.
truncate table public.filing_ingest_status;
