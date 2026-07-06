import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null | undefined;

/** Service-role client for server-side storage (Edgar bucket cache). Uses SUPABASE_SECRET_KEY. */
export function createAdminClient(): SupabaseClient | null {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    cachedAdminClient = null;
    return null;
  }

  cachedAdminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedAdminClient;
}

/** Test helper — reset the cached singleton between test cases. */
export function resetAdminClient(): void {
  cachedAdminClient = undefined;
}
