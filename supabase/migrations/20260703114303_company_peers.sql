-- Peer relationships: source company (left) -> comparable peer companies (right).

create table if not exists public.company_peers (
  id bigint generated always as identity primary key,
  source_company_id bigint not null references public.companies (id) on delete cascade,
  peer_company_id bigint not null references public.companies (id) on delete cascade,
  selection_method text not null check (selection_method in ('yahoo', 'sic', 'manual')),
  sort_order smallint not null default 0,
  score double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_peers_source_peer_key unique (source_company_id, peer_company_id),
  constraint company_peers_no_self check (source_company_id <> peer_company_id)
);

create index if not exists company_peers_source_company_id_idx
  on public.company_peers (source_company_id, sort_order);

create index if not exists company_peers_peer_company_id_idx
  on public.company_peers (peer_company_id);

create table if not exists public.company_peer_refreshes (
  source_company_id bigint primary key references public.companies (id) on delete cascade,
  refreshed_at timestamptz not null default now(),
  refresh_source text not null
);

alter table public.company_peers enable row level security;
alter table public.company_peer_refreshes enable row level security;

create policy "Allow public read access on company_peers"
  on public.company_peers
  for select
  using (true);

create policy "Allow public read access on company_peer_refreshes"
  on public.company_peer_refreshes
  for select
  using (true);

grant select on public.company_peers to anon, authenticated;
grant select on public.company_peer_refreshes to anon, authenticated;

grant select, insert, update, delete on public.company_peers to service_role;
grant select, insert, update, delete on public.company_peer_refreshes to service_role;

grant usage, select on sequence public.company_peers_id_seq to service_role;
