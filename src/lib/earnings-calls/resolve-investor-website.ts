import { formatCik } from "@/lib/edgar/constants";
import { submissionsUrl } from "@/lib/edgar/endpoints";
import { fetchSec } from "@/lib/edgar/sec-request";

type SecSubmissionsEntity = {
  cik?: string;
  name?: string;
  website?: string;
  investorWebsite?: string;
};

function normalizeWebsiteUrl(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
  return trimmed;
}

export type InvestorWebsiteResolution = {
  cik: string;
  entityName?: string;
  investorWebsite: string | null;
  website: string | null;
  preferredIrBase: string | null;
};

/**
 * Read investorWebsite / website from SEC submissions JSON (free, public).
 */
export async function resolveInvestorWebsite(cik: string): Promise<InvestorWebsiteResolution> {
  const formatted = formatCik(cik);
  const response = await fetchSec(submissionsUrl(formatted), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load SEC submissions for CIK ${formatted}`);
  }

  const data = (await response.json()) as SecSubmissionsEntity;
  const investorWebsite = normalizeWebsiteUrl(data.investorWebsite);
  const website = normalizeWebsiteUrl(data.website);

  return {
    cik: formatted,
    entityName: data.name,
    investorWebsite,
    website,
    preferredIrBase: investorWebsite ?? website,
  };
}
