import { createAiClient } from "@/lib/ai";
import { createEdgarClient } from "@/lib/edgar";
import { run_guidance_router, type GuidanceRouterOutput } from "@/lib/guidance";
import { getGuidanceCache } from "@/routes/lib/runtime-caches";
import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchGuidance(cik: string): Promise<GuidanceRouterOutput> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await edgar.getSubmissions(cik);

  let aiClient;
  try {
    aiClient = createAiClient();
  } catch {
    aiClient = undefined;
  }

  return run_guidance_router({
    cik,
    filings: submissions.filings,
    ixbrlFactsByAccession: {},
    cache: getGuidanceCache(),
    aiClient,
  });
}
