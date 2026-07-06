import { EDGAR_BUCKET } from "@/lib/orchestrate/form-8k/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyDocumentRow } from "@/lib/supabase/company-documents";

export type Stored8kContent = {
  form8kHtml: string;
  exhibit991Html: string | null;
};

export async function loadStored8kContent(document: CompanyDocumentRow): Promise<Stored8kContent> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required to read stored 8-K documents");
  }

  const { data: primaryBlob, error: primaryError } = await supabase.storage
    .from(EDGAR_BUCKET)
    .download(document.file_path);
  if (primaryError || !primaryBlob) {
    throw new Error(`Stored 8-K not found at ${document.file_path}`);
  }

  const form8kHtml = await primaryBlob.text();
  const ex99Path = document.file_path.replace(/\.htm$/, "-ex99.htm");
  const { data: exhibitBlob } = await supabase.storage.from(EDGAR_BUCKET).download(ex99Path);

  return {
    form8kHtml,
    exhibit991Html: exhibitBlob ? await exhibitBlob.text() : null,
  };
}

export async function loadStored10kHtml(document: CompanyDocumentRow): Promise<string> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required to read stored 10-K documents");
  }

  const { data, error } = await supabase.storage.from(EDGAR_BUCKET).download(document.file_path);
  if (error || !data) {
    throw new Error(`Stored 10-K not found at ${document.file_path}`);
  }

  return data.text();
}
