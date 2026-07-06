import { FORM10K_ANALYSIS_TYPE } from "@/lib/orchestrate/form-10k/paths";
import { isKnownUnavailableAccession } from "@/lib/orchestrate/company-filings/unavailable-filings";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDocumentsByCompany } from "@/lib/supabase/company-documents";

const FORM8K_ANALYSIS_TYPE = "form_8k_classification";

export type FilingPipelineStatus = {
  stored: boolean;
  analyzed: boolean;
  unavailable?: boolean;
};

export type FilingPipelineStatusMap = Record<string, FilingPipelineStatus>;

function analysisTypeForForm(formType: string): string | null {
  if (/^8-K/i.test(formType)) return FORM8K_ANALYSIS_TYPE;
  if (/^10-K/i.test(formType)) return FORM10K_ANALYSIS_TYPE;
  return null;
}

export async function getFilingPipelineStatus(
  companyId: number,
  accessions: string[],
): Promise<FilingPipelineStatusMap> {
  const status: FilingPipelineStatusMap = Object.fromEntries(
    accessions.map((accession) => {
      if (isKnownUnavailableAccession(accession)) {
        return [accession, { stored: true, analyzed: true, unavailable: true }];
      }
      return [accession, { stored: false, analyzed: false }];
    }),
  );

  if (accessions.length === 0) return status;

  const documents = await listDocumentsByCompany(companyId);
  const documentsByAccession = new Map(
    documents.map((document) => [document.accession_number, document]),
  );

  const relevantDocuments = accessions
    .map((accession) => documentsByAccession.get(accession))
    .filter((document): document is NonNullable<typeof document> => document != null);

  if (relevantDocuments.length === 0) return status;

  const supabase = createAdminClient();
  if (!supabase) {
    for (const document of relevantDocuments) {
      status[document.accession_number] = { stored: true, analyzed: false };
    }
    return status;
  }

  const documentIds = relevantDocuments.map((document) => document.id);
  const { data: analyses } = await supabase
    .from("company_document_analyses")
    .select("document_id, analysis_type")
    .in("document_id", documentIds);

  const analyzedByDocumentId = new Set(
    (analyses ?? []).map((row) => `${row.document_id}:${row.analysis_type}`),
  );

  for (const document of relevantDocuments) {
    if (document.unavailable_reason) {
      status[document.accession_number] = { stored: true, analyzed: true, unavailable: true };
      continue;
    }

    const analysisType = analysisTypeForForm(document.form_type);
    const analyzed =
      analysisType != null &&
      analyzedByDocumentId.has(`${document.id}:${analysisType}`);
    status[document.accession_number] = { stored: true, analyzed };
  }

  return status;
}
