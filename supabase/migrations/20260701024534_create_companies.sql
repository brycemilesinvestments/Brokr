create table if not exists public.companies (
  id bigint generated always as identity primary key,
  edgar_id text not null,
  name text not null,
  ticker text,
  sic text,
  sic_description text,
  state text,
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_edgar_id_key unique (edgar_id)
);

alter table public.companies enable row level security;

create policy "Allow public read access on companies"
  on public.companies
  for select
  using (true);

create policy "Authenticated users can insert on companies"
  on public.companies
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update on companies"
  on public.companies
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create index if not exists companies_last_viewed_at_idx
  on public.companies (last_viewed_at desc);
