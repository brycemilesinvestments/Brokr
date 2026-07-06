import { fetchSec } from "@/lib/edgar/sec-request";
import { filingDocumentUrl, filingIndexUrl } from "@/lib/edgar/constants";
import { filingIndexJsonUrl } from "@/lib/edgar/endpoints";

export type FilingIndexItem = {
  name: string;
  type?: string;
};

export async function listFilingIndexItems(
  cik: string,
  accessionNumber: string,
): Promise<FilingIndexItem[]> {
  const indexUrl = filingIndexJsonUrl(cik, accessionNumber);
  const indexRes = await fetchSec(indexUrl, { headers: { Accept: "application/json" } });
  const contentType = indexRes.headers.get("content-type") ?? "";

  if (indexRes.ok && contentType.includes("json")) {
    const index = (await indexRes.json()) as {
      directory?: { item?: Array<{ name?: string; type?: string }> };
    };
    return (index.directory?.item ?? [])
      .filter((item): item is { name: string; type?: string } => Boolean(item.name))
      .map((item) => ({ name: item.name, type: item.type }));
  }

  const cheerio = await import("cheerio");
  const htmlRes = await fetchSec(filingIndexUrl(cik, accessionNumber));
  const html = await htmlRes.text();
  const $ = cheerio.load(html);
  const items: FilingIndexItem[] = [];

  $("table a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.includes("-index")) return;
    const name = href.split("/").pop();
    if (name) items.push({ name });
  });

  return items;
}

/** Raw ownership XML is at accession root — not the XSLT path in submissions.primaryDocument. */
export function pickRawOwnershipXml(items: FilingIndexItem[]): string | undefined {
  const xmlCandidates = items.filter(
    (item) =>
      item.name.endsWith(".xml") &&
      !item.name.includes("xslF345") &&
      !item.name.includes("-index"),
  );

  return (
    xmlCandidates.find((item) => /form4|form3|form5|ownership|primary/i.test(item.name))?.name ??
    xmlCandidates[0]?.name
  );
}

export async function fetchRawOwnershipXml(
  cik: string,
  accessionNumber: string,
): Promise<{ xml: string; filename: string }> {
  const items = await listFilingIndexItems(cik, accessionNumber);
  const filename = pickRawOwnershipXml(items);

  if (!filename) {
    throw new Error(
      `No raw ownership XML found for ${accessionNumber}. Index: ${items.map((i) => i.name).join(", ")}`,
    );
  }

  const url = filingDocumentUrl(cik, accessionNumber, filename);
  const response = await fetchSec(url, {
    headers: { Accept: "application/xml,text/xml,*/*" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ownership XML (${response.status}): ${url}`);
  }

  const xml = await response.text();
  if (!xml.includes("ownershipDocument")) {
    throw new Error(`Document ${filename} is not ownership XML for ${accessionNumber}`);
  }

  return { xml, filename };
}
