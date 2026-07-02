import * as cheerio from "cheerio";
import { filingIndexUrl, formatCik, SEC_USER_AGENT } from "@/lib/edgar/constants";
import type {
  FilingDetailPage,
  FilingDocument,
  FilingParty,
} from "@/routes/company/[cik]/filing/[accession]/types";
import { resolveSecDocumentUrl, toAbsoluteSecUrl } from "@/lib/edgar/resolve-company";

function parseAddressBlock($: cheerio.CheerioAPI, container: ReturnType<cheerio.CheerioAPI>) {
  return container
    .find(".mailerAddress")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

function parseFormMetadata($: cheerio.CheerioAPI) {
  const formNameText = $("#formName").text().trim();
  const formTypeMatch = formNameText.match(/^Form\s+([^\s-]+(?:\s+[^\s-]+)*?)\s*-/i);
  const formType = formTypeMatch?.[1]?.trim() ?? formNameText;
  const formDescription = formNameText.replace(/^Form\s+[^\s-]+(?:\s+[^\s-]+)*?\s*-\s*/i, "").trim();

  const accessionText = $("#secNum").text().trim();
  const accessionMatch = accessionText.match(/(\d{10}-\d{2}-\d{6})/);
  const accessionNumber = accessionMatch?.[1] ?? "";

  const metadata: Record<string, string> = {};
  $(".formGrouping").each((_, group) => {
    const heads = $(group).find(".infoHead");
    heads.each((__, head) => {
      const label = $(head).text().trim();
      const value = $(head).next(".info").text().trim();
      if (label && value) {
        metadata[label] = value;
      }
    });
  });

  return {
    formType,
    formDescription,
    accessionNumber,
    filingDate: metadata["Filing Date"],
    accepted: metadata.Accepted,
    documentCount: metadata.Documents,
    periodOfReport: metadata["Period of Report"],
  };
}

function parseDocuments($: cheerio.CheerioAPI): FilingDocument[] {
  const table = $("table.tableFile").first();
  if (!table.length) return [];

  const documents: FilingDocument[] = [];

  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const sequence = $(cells[0]).text().trim() || undefined;
    const description = $(cells[1]).text().trim();
    const documentCell = $(cells[2]);
    const documentLink = documentCell.find("a").first();
    const documentName = documentLink.text().trim() || documentCell.text().trim();
    const documentUrl = resolveSecDocumentUrl(documentLink.attr("href")) ?? "";
    const documentCellText = documentCell.text().replace(/\s+/g, " ").trim();
    let type = $(cells[3]).text().trim() || undefined;
    if (/ixbrl/i.test(documentCellText) && type !== "iXBRL") {
      type = "iXBRL";
    }
    const size = $(cells[4]).text().trim() || undefined;

    if (!description && !documentName) return;

    documents.push({
      sequence,
      description,
      documentName,
      documentUrl: documentUrl ?? "",
      type,
      size,
    });
  });

  return documents;
}

function parseParties($: cheerio.CheerioAPI): FilingParty[] {
  const parties: FilingParty[] = [];

  $(".filerDiv").each((_, filer) => {
    const container = $(filer);
    const mailers = container.find(".mailer");
    const mailingAddress = parseAddressBlock($, mailers.eq(0));
    const businessAddress = parseAddressBlock($, mailers.eq(1));

    const companyNameEl = container.find(".companyName").first();
    if (!companyNameEl.length) return;

    const roleLink = companyNameEl.find("a").first();
    const role = roleLink.text().trim() || undefined;
    const roleUrl = toAbsoluteSecUrl(roleLink.attr("href"));

    const fullNameText = companyNameEl.text().trim();
    const nameText = fullNameText
      .replace(/\s*\([^)]*\)[\s\S]*/, "")
      .replace(/\s*CIK\s*:.*/i, "")
      .trim();

    const cikLink = companyNameEl.find("a").last();
    const cikMatch = cikLink.text().match(/(\d{10})/);
    const cik = cikMatch?.[1];
    const filingsUrl = toAbsoluteSecUrl(cikLink.attr("href"));
    const identInfo = container.find(".identInfo").first().text().trim() || undefined;

    parties.push({
      name: nameText,
      role,
      cik,
      roleUrl,
      filingsUrl,
      mailingAddress,
      businessAddress,
      identInfo,
    });
  });

  return parties;
}

export async function fetchFilingDetail(
  cikInput: string | number,
  accessionNumber: string,
): Promise<FilingDetailPage> {
  const cik = formatCik(cikInput);
  const secUrl = filingIndexUrl(cik, accessionNumber);

  const response = await fetch(secUrl, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load SEC filing ${accessionNumber} for CIK ${cik} (${response.status})`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  if (!$("#formName").length) {
    throw new Error(`No SEC filing found for accession ${accessionNumber}`);
  }

  const metadata = parseFormMetadata($);

  return {
    cik,
    accessionNumber: metadata.accessionNumber || accessionNumber,
    formType: metadata.formType,
    formDescription: metadata.formDescription,
    filingDate: metadata.filingDate,
    accepted: metadata.accepted,
    documentCount: metadata.documentCount,
    periodOfReport: metadata.periodOfReport,
    documents: parseDocuments($),
    parties: parseParties($),
    secUrl,
  };
}
