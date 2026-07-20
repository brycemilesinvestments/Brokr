import * as cheerio from "cheerio";

export type FilingIndexItem = {
  name?: string;
  type?: string;
  size?: string;
  description?: string;
};

function matchesDocType(type: string | undefined, pattern: RegExp): boolean {
  return pattern.test((type ?? "").trim());
}

export type FilingIndexDocuments = {
  form8k: FilingIndexItem | null;
  exhibit991: FilingIndexItem | null;
};

export function normalizeIndexItems(raw: unknown): FilingIndexItem[] {
  if (!raw || typeof raw !== "object") return [];
  const directory = (raw as Record<string, unknown>).directory;
  if (!directory || typeof directory !== "object") return [];

  const item = (directory as Record<string, unknown>).item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item as FilingIndexItem];
}

export function pick8kDocumentsFromItems(items: FilingIndexItem[]): FilingIndexDocuments {
  const form8k =
    items.find((item) => matchesDocType(item.type, /^8-K/i)) ??
    items.find((item) => /\.htm/i.test(item.name ?? "") && /8-k/i.test(item.description ?? item.name ?? "")) ??
    null;

  const exhibit991 =
    items.find((item) => matchesDocType(item.type, /^EX-99\.1/i)) ??
    items.find((item) => /ex99|exhibit99|ex-99/i.test(item.name ?? "")) ??
    null;

  return { form8k, exhibit991 };
}

function pick8kDocuments(indexJson: Record<string, unknown>): FilingIndexDocuments {
  return pick8kDocumentsFromItems(normalizeIndexItems(indexJson));
}

/** Parse SEC filing index HTML (table.tableFile) into document rows. */
export function parseFilingIndexHtml(html: string): FilingIndexItem[] {
  const $ = cheerio.load(html);
  const table = $("table.tableFile").first();
  if (!table.length) return [];

  const items: FilingIndexItem[] = [];

  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const description = $(cells[1]).text().trim();
    const documentCell = $(cells[2]);
    const documentLink = documentCell.find("a").first();
    const name = documentLink.text().trim() || documentCell.text().trim();
    const type = $(cells[3]).text().trim() || undefined;
    const size = $(cells[4]).text().trim() || undefined;

    if (!name && !description) return;

    items.push({ name, type, size, description });
  });

  return items;
}
