import type { CompanyAnalysisOutput } from "@/lib/orchestrate/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyAnalysisRow = {
  id: number;
  company_id: number;
  result: CompanyAnalysisOutput;
  source_fingerprint: string;
  compiled_at: string;
  compile_cost_usd: number;
};

function mapRow(row: Record<string, unknown>): CompanyAnalysisRow {
  return {
    id: Number(row.id),
    company_id: Number(row.company_id),
    result: row.result as CompanyAnalysisOutput,
    source_fingerprint: String(row.source_fingerprint),
    compiled_at: String(row.compiled_at),
    compile_cost_usd: Number(row.compile_cost_usd),
  };
}

export async function getCompanyAnalysis(
  companyId: number,
): Promise<CompanyAnalysisRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("company_analyses")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

export async function upsertCompanyAnalysis(input: {
  companyId: number;
  result: CompanyAnalysisOutput;
  sourceFingerprint: string;
  compileCostUsd: number;
}): Promise<CompanyAnalysisRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("company_analyses")
    .upsert(
      {
        company_id: input.companyId,
        result: input.result,
        source_fingerprint: input.sourceFingerprint,
        compile_cost_usd: input.compileCostUsd,
        compiled_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    )
    .select("*")
    .single();

  if (error || !data) return null;
  return mapRow(data);
}
