-- K3 / K12 — audited flag and K1 source tagging on RAG chunks.

alter table public.filing_chunks
  add column if not exists audited boolean not null default false;

alter table public.filing_chunks
  add column if not exists source text not null default 'ixbrl_textblock';

alter table public.structured_metrics
  add column if not exists audited boolean not null default false;

create index if not exists filing_chunks_audited_idx
  on public.filing_chunks (company_id, audited);

drop function if exists public.match_filing_chunks(extensions.vector, text, integer, text);
drop function if exists public.match_filing_chunks(extensions.vector, text, integer, text, boolean);

create or replace function public.match_filing_chunks(
  query_embedding extensions.vector(1024),
  match_company_id text,
  match_count integer default 8,
  match_period_end text default null,
  match_audited boolean default null
)
returns table (
  id uuid,
  company_id text,
  accession text,
  section_type text,
  period_end text,
  chunk_index integer,
  text text,
  audited boolean,
  source text,
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
    fc.audited,
    fc.source,
    1 - (fc.embedding <=> query_embedding) as similarity
  from public.filing_chunks fc
  where fc.company_id = match_company_id
    and (match_period_end is null or fc.period_end = match_period_end)
    and (match_audited is null or fc.audited = match_audited)
  order by fc.embedding <=> query_embedding
  limit match_count;
$$;
