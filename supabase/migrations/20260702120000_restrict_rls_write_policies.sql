-- Restrict write access to authenticated users; keep public read policies.

drop policy if exists "Allow public insert on companies" on public.companies;
drop policy if exists "Allow public update on companies" on public.companies;

create policy "Authenticated users can insert on companies"
  on public.companies
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update on companies"
  on public.companies
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Allow public insert on filing_chunks" on public.filing_chunks;
drop policy if exists "Allow public delete on filing_chunks" on public.filing_chunks;

create policy "Authenticated users can insert on filing_chunks"
  on public.filing_chunks
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can delete on filing_chunks"
  on public.filing_chunks
  for delete
  using (auth.uid() is not null);

drop policy if exists "Allow public insert on structured_metrics" on public.structured_metrics;
drop policy if exists "Allow public delete on structured_metrics" on public.structured_metrics;

create policy "Authenticated users can insert on structured_metrics"
  on public.structured_metrics
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can delete on structured_metrics"
  on public.structured_metrics
  for delete
  using (auth.uid() is not null);

drop policy if exists "Allow public insert on filing_ingest_status" on public.filing_ingest_status;
drop policy if exists "Allow public update on filing_ingest_status" on public.filing_ingest_status;

create policy "Authenticated users can insert on filing_ingest_status"
  on public.filing_ingest_status
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update on filing_ingest_status"
  on public.filing_ingest_status
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Allow public insert on company_documents" on public.company_documents;
drop policy if exists "Allow public update on company_documents" on public.company_documents;

create policy "Authenticated users can insert on company_documents"
  on public.company_documents
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update on company_documents"
  on public.company_documents
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Allow public insert on company_document_analyses" on public.company_document_analyses;
drop policy if exists "Allow public update on company_document_analyses" on public.company_document_analyses;

create policy "Authenticated users can insert on company_document_analyses"
  on public.company_document_analyses
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update on company_document_analyses"
  on public.company_document_analyses
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
