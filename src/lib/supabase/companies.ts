import { formatCik } from "@/lib/edgar/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CompanyRow = {
  id: number;
  edgar_id: string;
  name: string;
  ticker: string | null;
  sic: string | null;
  sic_description: string | null;
  state: string | null;
  last_viewed_at: string;
  created_at: string;
  updated_at: string;
};

export type CompanySearchInput = {
  name: string;
  edgarId: string;
  ticker?: string | null;
};

function mapRow(row: Record<string, unknown>): CompanyRow {
  return {
    id: Number(row.id),
    edgar_id: String(row.edgar_id),
    name: String(row.name),
    ticker: (row.ticker as string | null) ?? null,
    sic: (row.sic as string | null) ?? null,
    sic_description: (row.sic_description as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    last_viewed_at: String(row.last_viewed_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export async function getRecentCompanies(limit = 8): Promise<CompanyRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("companies")
    .select("id, edgar_id, name, ticker, sic, sic_description, state, last_viewed_at, created_at, updated_at")
    .order("last_viewed_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapRow);
}

export async function getCompanyByEdgarId(edgarId: string): Promise<CompanyRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("companies")
    .select("id, edgar_id, name, ticker, sic, sic_description, state, last_viewed_at, created_at, updated_at")
    .eq("edgar_id", formatCik(edgarId))
    .maybeSingle();

  return data ? mapRow(data) : null;
}

async function getCompanyById(id: number): Promise<CompanyRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("companies")
    .select("id, edgar_id, name, ticker, sic, sic_description, state, last_viewed_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  return data ? mapRow(data) : null;
}

async function upsertCompanyFromSearch(input: CompanySearchInput): Promise<CompanyRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("companies")
    .upsert(
      {
        edgar_id: formatCik(input.edgarId),
        name: input.name,
        ticker: input.ticker ?? null,
        updated_at: now,
      },
      { onConflict: "edgar_id" },
    )
    .select("id, edgar_id, name, ticker, sic, sic_description, state, last_viewed_at, created_at, updated_at")
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function upsertCompaniesFromSearch(inputs: CompanySearchInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const supabase = createAdminClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  await supabase.from("companies").upsert(
    inputs.map((input) => ({
      edgar_id: formatCik(input.edgarId),
      name: input.name,
      ticker: input.ticker ?? null,
      updated_at: now,
    })),
    { onConflict: "edgar_id" },
  );
}

export async function upsertCompanyProfile(input: {
  edgarId: string;
  name: string;
  ticker?: string | null;
  sic?: string | null;
  sicDescription?: string | null;
  state?: string | null;
}): Promise<CompanyRow | null> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("companies")
    .upsert(
      {
        edgar_id: formatCik(input.edgarId),
        name: input.name,
        ticker: input.ticker ?? null,
        sic: input.sic ?? null,
        sic_description: input.sicDescription ?? null,
        state: input.state ?? null,
        last_viewed_at: now,
        updated_at: now,
      },
      { onConflict: "edgar_id" },
    )
    .select("id, edgar_id, name, ticker, sic, sic_description, state, last_viewed_at, created_at, updated_at")
    .single();

  if (error || !data) return null;
  return mapRow(data);
}
