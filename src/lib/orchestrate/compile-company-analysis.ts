import { analyzeCompany, type AnalyzeCompanyDeps } from "@/lib/orchestrate/analyze-company";
import { buildSourceFingerprint } from "@/lib/orchestrate/company-analysis-fingerprint";
import { fetchLatestIxbrlFacts } from "@/lib/orchestrate/fetch-ixbrl-facts";
import type { AnalyzeCompanyInput, CompanyAnalysisOutput } from "@/lib/orchestrate/types";
import { getCompanyAnalysis, upsertCompanyAnalysis } from "@/lib/supabase/company-analyses";
import { listDocumentsByCompany } from "@/lib/supabase/company-documents";
import { getCompanyByEdgarId } from "@/lib/supabase/companies";
import { formatCik } from "@/lib/edgar/constants";

export type CompileCompanyAnalysisResult = {
  output: CompanyAnalysisOutput;
  fromCache: boolean;
  compiled: boolean;
  sourceFingerprint: string;
};

async function resolveSourceFingerprint(companyId: number): Promise<string> {
  const documents = await listDocumentsByCompany(companyId);
  return buildSourceFingerprint(documents.map((document) => document.accession_number));
}

export async function getStoredCompanyAnalysisByCik(
  cik: string,
): Promise<CompanyAnalysisOutput | null> {
  const company = await getCompanyByEdgarId(formatCik(cik));
  if (!company) return null;

  const stored = await getCompanyAnalysis(company.id);
  return stored?.result ?? null;
}

/** Return cached analysis or compile and persist when the document fingerprint changed. */
export async function compileCompanyAnalysisIfNeeded(
  input: AnalyzeCompanyInput & { force?: boolean },
  deps: AnalyzeCompanyDeps,
): Promise<CompileCompanyAnalysisResult> {
  const company = await getCompanyByEdgarId(formatCik(input.cik));
  if (!company) {
    throw new Error(`Company not found for CIK ${input.cik}`);
  }

  const sourceFingerprint = await resolveSourceFingerprint(company.id);
  const stored = await getCompanyAnalysis(company.id);

  if (!input.force && stored && stored.source_fingerprint === sourceFingerprint) {
    return {
      output: stored.result,
      fromCache: true,
      compiled: false,
      sourceFingerprint,
    };
  }

  const resolvedDeps: AnalyzeCompanyDeps = {
    ...deps,
    ixbrlFacts: await fetchLatestIxbrlFacts(formatCik(input.cik), deps.edgar),
  };
  const output = await analyzeCompany(
    { cik: formatCik(input.cik), ticker: input.ticker ?? company.ticker ?? undefined },
    resolvedDeps,
  );

  await upsertCompanyAnalysis({
    companyId: company.id,
    result: output,
    sourceFingerprint,
    compileCostUsd: output.costUsd,
  });

  return {
    output,
    fromCache: false,
    compiled: true,
    sourceFingerprint,
  };
}

/** Compile when stale; no-op if fingerprint already matches. Used after document ingest. */
export async function maybeCompileCompanyAnalysis(
  input: AnalyzeCompanyInput,
  deps: AnalyzeCompanyDeps,
): Promise<CompileCompanyAnalysisResult | null> {
  try {
    return await compileCompanyAnalysisIfNeeded(input, deps);
  } catch {
    return null;
  }
}
