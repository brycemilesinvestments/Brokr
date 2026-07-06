import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyDocumentRow = {
  id: number;
  company_id: number;
  file_path: string;
  form_type: string;
  accession_number: string;
  filing_date: string;
  report_date: string | null;
  description: string | null;
  primary_document: string | null;
  items: string | null;
  size_bytes: number | null;
  documents_url: string | null;
  unavailable_reason: string | null;
  created_at: string;
};

export type CompanyDocumentInput = {
  companyId: number;
  filePath: string;
  formType: string;
  accessionNumber: string;
  filingDate: string;
  reportDate?: string | null;
  description?: string | null;
  primaryDocument?: string | null;
  items?: string | null;
  sizeBytes?: number | null;
  documentsUrl?: string | null;
  unavailableReason?: string | null;
};

export type CompanyDocumentAnalysisRow = {
  id: number;
  document_id: number;
  analysis_type: string;
  result: Record<string, unknown>;
  created_at: string;
};

function mapDocument(row: Record<string, unknown>): CompanyDocumentRow {
  return {
    id: Number(row.id),
    company_id: Number(row.company_id),
    file_path: String(row.file_path),
    form_type: String(row.form_type),
    accession_number: String(row.accession_number),
    filing_date: String(row.filing_date),
    report_date: (row.report_date as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    primary_document: (row.primary_document as string | null) ?? null,
    items: (row.items as string | null) ?? null,
    size_bytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    documents_url: (row.documents_url as string | null) ?? null,
    unavailable_reason: (row.unavailable_reason as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function getDocumentByAccession(
  companyId: number,
  accessionNumber: string,
): Promise<CompanyDocumentRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("company_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("accession_number", accessionNumber)
    .maybeSingle();

  return data ? mapDocument(data) : null;
}

export async function listDocumentsByCompany(companyId: number): Promise<CompanyDocumentRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("company_documents")
    .select("*")
    .eq("company_id", companyId)
    .order("filing_date", { ascending: false });

  return (data ?? []).map(mapDocument);
}

export async function upsertDocument(input: CompanyDocumentInput): Promise<CompanyDocumentRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("company_documents")
    .upsert(
      {
        company_id: input.companyId,
        file_path: input.filePath,
        form_type: input.formType,
        accession_number: input.accessionNumber,
        filing_date: input.filingDate,
        report_date: input.reportDate ?? null,
        description: input.description ?? null,
        primary_document: input.primaryDocument ?? null,
        items: input.items ?? null,
        size_bytes: input.sizeBytes ?? null,
        documents_url: input.documentsUrl ?? null,
        unavailable_reason: input.unavailableReason ?? null,
      },
      { onConflict: "company_id,accession_number" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("upsertDocument failed:", error.message, {
      accessionNumber: input.accessionNumber,
      companyId: input.companyId,
    });
    return null;
  }

  if (!data) return null;
  return mapDocument(data);
}

export async function upsertDocumentAnalysis(input: {
  documentId: number;
  analysisType?: string;
  result: Record<string, unknown>;
}): Promise<CompanyDocumentAnalysisRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("company_document_analyses")
    .upsert(
      {
        document_id: input.documentId,
        analysis_type: input.analysisType ?? "form_8k_classification",
        result: input.result,
      },
      { onConflict: "document_id,analysis_type" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: Number(data.id),
    document_id: Number(data.document_id),
    analysis_type: String(data.analysis_type),
    result: data.result as Record<string, unknown>,
    created_at: String(data.created_at),
  };
}

export async function getDocumentAnalysis(
  documentId: number,
  analysisType = "form_8k_classification",
): Promise<CompanyDocumentAnalysisRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("company_document_analyses")
    .select("*")
    .eq("document_id", documentId)
    .eq("analysis_type", analysisType)
    .maybeSingle();

  if (!data) return null;

  return {
    id: Number(data.id),
    document_id: Number(data.document_id),
    analysis_type: String(data.analysis_type),
    result: data.result as Record<string, unknown>,
    created_at: String(data.created_at),
  };
}
