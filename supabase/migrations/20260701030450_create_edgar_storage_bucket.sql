-- SEC filing cache and 8-K document storage (see EDGAR_BUCKET in src/lib/edgar/client.ts)
insert into storage.buckets (id, name, public)
values ('edgar', 'edgar', false)
on conflict (id) do nothing;

-- Service-role uploads use the admin client; these policies support upsert via the API when needed.
create policy "Allow public read on edgar storage"
  on storage.objects
  for select
  using (bucket_id = 'edgar');

create policy "Allow public insert on edgar storage"
  on storage.objects
  for insert
  with check (bucket_id = 'edgar');

create policy "Allow public update on edgar storage"
  on storage.objects
  for update
  using (bucket_id = 'edgar')
  with check (bucket_id = 'edgar');

create policy "Allow public delete on edgar storage"
  on storage.objects
  for delete
  using (bucket_id = 'edgar');
