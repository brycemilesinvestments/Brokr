import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role client for server-side storage (Edgar bucket cache). Uses SUPABASE_SECRET_KEY. */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
