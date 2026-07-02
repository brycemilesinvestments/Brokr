import type { CompanyFilingsPage } from "@/routes/company/[cik]/types";
import type { CompanyTicker } from "@/lib/edgar/types";
import { upsertCompanyProfile } from "@/lib/supabase/companies";

export async function recordCompanyView(
  page: CompanyFilingsPage,
  companyMeta?: CompanyTicker | null,
) {
  await upsertCompanyProfile({
    edgarId: page.cik,
    name: page.info.name,
    ticker: companyMeta?.ticker ?? null,
    sic: page.info.sic ?? null,
    sicDescription: page.info.sicDescription ?? null,
    state: page.info.state ?? null,
  });
}
