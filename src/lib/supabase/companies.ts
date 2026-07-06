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

function isTransientFetchError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch failed") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout") ||
    normalized.includes("socket hang up")
  );
}

async function withTransientRetry<T>(
  label: string,
  task: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await task();
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error &&
        typeof result.error === "object" &&
        "message" in result.error &&
        typeof result.error.message === "string" &&
        isTransientFetchError(result.error.message) &&
        attempt < maxAttempts
      ) {
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
        continue;
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(message);
      if (!isTransientFetchError(message) || attempt === maxAttempts) {
        console.error(`${label} failed:`, message);
        throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }

  throw lastError ?? new Error(`${label} failed`);
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

  try {
    const { data, error } = await withTransientRetry("getCompanyByEdgarId", async () =>
      supabase
        .from("companies")
        .select("id, edgar_id, name, ticker, sic, sic_description, state, last_viewed_at, created_at, updated_at")
        .eq("edgar_id", formatCik(edgarId))
        .maybeSingle(),
    );

    if (error) {
      console.error("getCompanyByEdgarId failed:", error.message);
      return null;
    }

    return data ? mapRow(data) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("getCompanyByEdgarId failed:", message);
    return null;
  }
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

  try {
    const { data, error } = await withTransientRetry("upsertCompanyProfile", async () =>
      supabase
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
        .single(),
    );

    if (error) {
      console.error("upsertCompanyProfile failed:", error.message);
      return null;
    }

    if (!data) return null;
    return mapRow(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("upsertCompanyProfile failed:", message);
    return null;
  }
}
