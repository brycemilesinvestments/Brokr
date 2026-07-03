-- FRED economic time series metadata, observations, and ingestion checkpoint state.

create table if not exists public.fred_series (
  series_id           text primary key,
  name                text not null,
  category            text not null,
  description         text,
  frequency           text,
  units               text,
  seasonal_adjustment text,
  fred_title          text,
  last_updated        text,
  updated_at          timestamptz default now()
);

create table if not exists public.fred_observations (
  id               bigserial primary key,
  series_id        text not null references public.fred_series (series_id),
  observation_date date not null,
  value            numeric,
  unique (series_id, observation_date)
);

create index if not exists idx_fred_obs_series_date
  on public.fred_observations (series_id, observation_date desc);

create index if not exists idx_fred_series_category
  on public.fred_series (category);

create table if not exists public.fred_ingestion_state (
  id              int primary key default 1,
  completed       text[] default '{}',
  failed          text[] default '{}',
  in_progress     text,
  started_at      timestamptz default now(),
  last_updated_at timestamptz default now(),
  constraint fred_ingestion_state_singleton check (id = 1)
);

alter table public.fred_series enable row level security;
alter table public.fred_observations enable row level security;
alter table public.fred_ingestion_state enable row level security;

create policy "Allow public read access on fred_series"
  on public.fred_series
  for select
  using (true);

create policy "Allow public read access on fred_observations"
  on public.fred_observations
  for select
  using (true);

create policy "Allow public read access on fred_ingestion_state"
  on public.fred_ingestion_state
  for select
  using (true);

grant select on public.fred_series to anon, authenticated;
grant select on public.fred_observations to anon, authenticated;
grant select on public.fred_ingestion_state to anon, authenticated;

grant select, insert, update, delete on public.fred_series to service_role;
grant select, insert, update, delete on public.fred_observations to service_role;
grant select, insert, update, delete on public.fred_ingestion_state to service_role;

grant usage, select on sequence public.fred_observations_id_seq to service_role;
