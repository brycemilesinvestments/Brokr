alter table public.company_documents
  add column if not exists unavailable_reason text;

create index if not exists company_documents_unavailable_reason_idx
  on public.company_documents (unavailable_reason)
  where unavailable_reason is not null;
