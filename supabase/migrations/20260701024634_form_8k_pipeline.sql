create table if not exists public.company_documents (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  file_path text not null,
  form_type text not null,
  accession_number text not null,
  filing_date date not null,
  report_date date,
  description text,
  primary_document text,
  items text,
  size_bytes integer,
  documents_url text,
  created_at timestamptz not null default now(),
  unique (company_id, accession_number)
);

create index if not exists company_documents_company_id_idx
  on public.company_documents (company_id);

create index if not exists company_documents_accession_idx
  on public.company_documents (accession_number);

create table if not exists public.company_document_analyses (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.company_documents (id) on delete cascade,
  analysis_type text not null default 'form_8k_classification',
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (document_id, analysis_type)
);

create index if not exists company_document_analyses_document_id_idx
  on public.company_document_analyses (document_id);

alter table public.filing_chunks
  add column if not exists document_id bigint references public.company_documents (id) on delete cascade;

create index if not exists filing_chunks_document_id_idx
  on public.filing_chunks (document_id);

alter table public.company_documents enable row level security;
alter table public.company_document_analyses enable row level security;

create policy "Allow public read on company_documents"
  on public.company_documents for select using (true);

create policy "Allow public insert on company_documents"
  on public.company_documents for insert with check (true);

create policy "Allow public update on company_documents"
  on public.company_documents for update using (true) with check (true);

create policy "Allow public read on company_document_analyses"
  on public.company_document_analyses for select using (true);

create policy "Allow public insert on company_document_analyses"
  on public.company_document_analyses for insert with check (true);

create policy "Allow public update on company_document_analyses"
  on public.company_document_analyses for update using (true) with check (true);
