import {
  createEdgarClient,
  formatCik,
  SEC_BASE_URL,
} from "@/lib/edgar";
import { EDGAR_BUCKET } from "@/lib/orchestrate/form-8k/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentByAccession } from "@/lib/supabase/company-documents";
import { getCompanyByEdgarId } from "@/lib/supabase/companies";

function accessionArchivePrefix(cik: string, accessionNumber: string): string {
  const numericCik = String(cik).replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `/Archives/edgar/data/${numericCik}/${accessionPath}/`;
}

function resolveSecDocumentUrl(
  cik: string,
  accessionNumber: string,
  archivePath: string,
): string {
  if (archivePath.includes("..") || archivePath.startsWith("/")) {
    throw new Error("Invalid document path");
  }

  const prefix = accessionArchivePrefix(cik, accessionNumber);
  return `${SEC_BASE_URL}${prefix}${archivePath}`;
}

function documentBaseUrl(secDocumentUrl: string): string {
  const url = new URL(secDocumentUrl);
  const segments = url.pathname.split("/");
  segments.pop();
  return `${url.origin}${segments.join("/")}/`;
}

function injectDocumentBase(html: string, baseUrl: string): string {
  const baseTag = `<base href="${baseUrl}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`);
  }
  return `${baseTag}${html}`;
}

function isLikelyEx99Document(filename: string): boolean {
  return /ex[-_.]?99/i.test(filename);
}

function archivePathBasename(archivePath: string): string {
  return archivePath.split("/").pop() ?? archivePath;
}

async function readStoredHtml(filePath: string): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(EDGAR_BUCKET).download(filePath);
  if (error || !data) return null;
  return data.text();
}

async function readStoredDocumentHtml(
  companyId: number,
  accessionNumber: string,
  archivePath: string,
): Promise<string | null> {
  const stored = await getDocumentByAccession(companyId, accessionNumber);
  if (!stored) return null;

  const filename = archivePathBasename(archivePath);

  if (stored.primary_document === filename) {
    return readStoredHtml(stored.file_path);
  }

  if (isLikelyEx99Document(filename)) {
    const ex99Path = stored.file_path.replace(/\.htm$/, "-ex99.htm");
    return readStoredHtml(ex99Path);
  }

  return null;
}

export async function fetchFilingDocumentHtml(
  cik: string,
  accessionNumber: string,
  archivePath: string,
): Promise<string> {
  const formattedCik = formatCik(cik);
  const secDocumentUrl = resolveSecDocumentUrl(formattedCik, accessionNumber, archivePath);
  const baseUrl = documentBaseUrl(secDocumentUrl);
  const company = await getCompanyByEdgarId(formattedCik);

  if (company) {
    const storedHtml = await readStoredDocumentHtml(company.id, accessionNumber, archivePath);
    if (storedHtml) {
      return injectDocumentBase(storedHtml, baseUrl);
    }
  }

  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const filename = archivePathBasename(archivePath);
  const html = await client.fetchText(secDocumentUrl, {
    useCache: true,
    cik: formattedCik,
    accession: accessionNumber,
    filename,
  });

  return injectDocumentBase(html, baseUrl);
}
