-- Canonical financial metric definitions shared across companies.
--
-- Two ingestion paths:
--   1. structured_metrics (company_id + metric_name + period) — RAG/chat filing index
--   2. Company analysis API — derived metrics (gross_margin, dso, …) computed from Edgar
--      at request time; polarities land here via resolveMetricPolarities on first sighting.
--
-- This migration backfills definitions from existing structured_metrics rows, then links FKs.

create table if not exists public.financial_metric_definitions (
  id bigint generated always as identity primary key,
  metric_key text not null,
  display_name text not null,
  polarity text not null check (polarity in ('higher_better', 'lower_better', 'neutral')),
  category text,
  reasoning text,
  classified_by text not null default 'heuristic' check (classified_by in ('ai', 'heuristic', 'manual')),
  model text,
  classified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_metric_definitions_metric_key_key unique (metric_key)
);

create index if not exists financial_metric_definitions_polarity_idx
  on public.financial_metric_definitions (polarity);

alter table public.structured_metrics
  add column if not exists metric_definition_id bigint
  references public.financial_metric_definitions (id) on delete set null;

create index if not exists structured_metrics_metric_definition_id_idx
  on public.structured_metrics (metric_definition_id);

-- Mirrors src/lib/metrics/polarity/heuristics.ts for SQL-side backfill and ingest triggers.
create or replace function public.guess_metric_polarity(metric_key text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when metric_key in (
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'GrossProfit',
      'OperatingIncomeLoss',
      'NetIncomeLoss',
      'EarningsPerShareBasic',
      'EarningsPerShareDiluted',
      'Assets',
      'AssetsCurrent',
      'StockholdersEquity',
      'CashAndCashEquivalentsAtCarryingValue',
      'NetCashProvidedByUsedInOperatingActivities',
      'free_cash_flow',
      'RevenueRemainingPerformanceObligation',
      'gross_margin',
      'operating_margin',
      'net_margin',
      'current_ratio',
      'return_on_equity',
      'fcf_margin'
    ) then 'higher_better'
    when metric_key in (
      'Liabilities',
      'debt_to_equity',
      'capex_intensity',
      'dso',
      'dio',
      'dpo',
      'cash_conversion_cycle',
      'sbc_pct_revenue',
      'share_count_trend',
      'net_issuance',
      'pe',
      'p_fcf',
      'ev_sales',
      'ev_ebitda'
    ) then 'lower_better'
    when metric_key in (
      'NetCashProvidedByUsedInInvestingActivities',
      'NetCashProvidedByUsedInFinancingActivities'
    ) then 'neutral'
    when metric_key like 'end_market:%' or metric_key like 'geography:%' then 'higher_better'
    when metric_key ~* '(expense|liabilit|debt|payable|dilut|sharesissued|outstanding.*shares)'
      and metric_key !~* '(gross.?profit|operating.?income|net.?income)' then 'lower_better'
    when metric_key ~* '(revenue|income|profit|margin|equity|asset|cash|earnings|backlog|obligation|return)'
      and metric_key !~* 'conversion' then 'higher_better'
    else 'neutral'
  end;
$$;

-- Backfill: one definition per distinct metric_name already indexed for RAG.
insert into public.financial_metric_definitions (
  metric_key,
  display_name,
  polarity,
  classified_by,
  reasoning
)
select distinct on (sm.metric_name)
  sm.metric_name,
  sm.display_name,
  public.guess_metric_polarity(sm.metric_name),
  'heuristic',
  'Backfilled from structured_metrics with name-pattern heuristic.'
from public.structured_metrics sm
order by sm.metric_name, sm.display_name
on conflict (metric_key) do nothing;

-- Link existing structured_metrics rows to their canonical definitions.
update public.structured_metrics sm
set metric_definition_id = fmd.id
from public.financial_metric_definitions fmd
where sm.metric_name = fmd.metric_key
  and sm.metric_definition_id is distinct from fmd.id;

-- Auto-link (and auto-create heuristic definitions) on future RAG metric ingests.
create or replace function public.link_structured_metric_definition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  def_id bigint;
begin
  select id into def_id
  from public.financial_metric_definitions
  where metric_key = new.metric_name;

  if def_id is null then
    insert into public.financial_metric_definitions (
      metric_key,
      display_name,
      polarity,
      classified_by,
      reasoning
    )
    values (
      new.metric_name,
      new.display_name,
      public.guess_metric_polarity(new.metric_name),
      'heuristic',
      'Auto-created on structured_metrics ingest.'
    )
    on conflict (metric_key) do update
      set display_name = excluded.display_name,
          updated_at = now()
    returning id into def_id;
  end if;

  new.metric_definition_id := def_id;
  return new;
end;
$$;

drop trigger if exists structured_metrics_link_definition on public.structured_metrics;

create trigger structured_metrics_link_definition
  before insert or update of metric_name, display_name
  on public.structured_metrics
  for each row
  execute function public.link_structured_metric_definition();

alter table public.financial_metric_definitions enable row level security;

create policy "Allow public read on financial_metric_definitions"
  on public.financial_metric_definitions
  for select
  using (true);

grant select on public.financial_metric_definitions to anon, authenticated;
grant select, insert, update on public.financial_metric_definitions to service_role;

grant usage, select on sequence public.financial_metric_definitions_id_seq to service_role;

-- Compiled company analysis snapshot (dashboard reads this; no per-page recompute).
create table if not exists public.company_analyses (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  result jsonb not null,
  source_fingerprint text not null,
  compiled_at timestamptz not null default now(),
  compile_cost_usd numeric not null default 0,
  constraint company_analyses_company_id_key unique (company_id)
);

create index if not exists company_analyses_company_id_idx
  on public.company_analyses (company_id);

create index if not exists company_analyses_compiled_at_idx
  on public.company_analyses (compiled_at desc);

alter table public.company_analyses enable row level security;

create policy "Allow public read on company_analyses"
  on public.company_analyses
  for select
  using (true);

grant select on public.company_analyses to anon, authenticated;
grant select, insert, update, delete on public.company_analyses to service_role;

grant usage, select on sequence public.company_analyses_id_seq to service_role;
