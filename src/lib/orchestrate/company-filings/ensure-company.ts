import { formatCik } from "@/lib/edgar/constants";
import { createEdgarClient } from "@/lib/edgar";
import {
  getCompanyByEdgarId,
  upsertCompanyProfile,
  type CompanyRow,
} from "@/lib/supabase/companies";
import { createAdminClient } from "@/lib/supabase/admin";

const inflightByEdgarId = new Map<string, Promise<CompanyRow>>();

async function ensureCompanyInner(edgarId: string): Promise<CompanyRow> {
  const formatted = formatCik(edgarId);
  const existing = await getCompanyByEdgarId(formatted);
  if (existing) return existing;

  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await client.getSubmissions(formatted);
  const name = submissions.entityName?.trim();
  if (!name) {
    throw new Error(`SEC submissions missing entity name for CIK ${formatted}`);
  }

  const created = await upsertCompanyProfile({
    edgarId: formatted,
    name,
  });

  if (created) return created;

  // Another request may have created the row while we were fetching from SEC.
  const raced = await getCompanyByEdgarId(formatted);
  if (raced) return raced;

  throw new Error(`Unable to create company record for CIK ${formatted}`);
}

/** Resolve or create the company row once per CIK, even under parallel pipeline load. */
export async function ensureCompany(edgarId: string): Promise<CompanyRow> {
  const formatted = formatCik(edgarId);
  const pending = inflightByEdgarId.get(formatted);
  if (pending) return pending;

  const work = ensureCompanyInner(formatted).finally(() => {
    if (inflightByEdgarId.get(formatted) === work) {
      inflightByEdgarId.delete(formatted);
    }
  });

  inflightByEdgarId.set(formatted, work);
  return work;
}
