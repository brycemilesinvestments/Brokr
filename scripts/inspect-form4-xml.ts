/**
 * Phase 2 — inspect real Form 3/4/5 primary_doc.xml element trees.
 * Usage: npx tsx scripts/inspect-form4-xml.ts
 */

import { loadEnvFile } from "node:process";
import { fetchSec } from "../src/lib/edgar/sec-request";
import { formatCik, filingDocumentUrl } from "../src/lib/edgar/constants";
import { filingIndexJsonUrl } from "../src/lib/edgar/endpoints";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

type SampleFiling = {
  cik: string;
  form: string;
  accession: string;
  filed: string;
  primary: string;
};

function collectElements(xml: string): Map<string, number> {
  const counts = new Map<string, number>();
  const re = /<([a-zA-Z][\w.-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const tag = match[1];
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

function printTree(xml: string, maxDepth = 4): void {
  const stack: string[] = [];
  const re = /<\/?([a-zA-Z][\w.-]*)(?:\s[^>]*)?\/?>/g;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = re.exec(xml)) !== null) {
    const full = match[0];
    const tag = match[1];
    const isClose = full.startsWith("</");
    const isSelfClosing = full.endsWith("/>");

    if (isClose) {
      stack.pop();
      continue;
    }

    const path = [...stack, tag].join("/");
    if (!seen.has(path) && stack.length < maxDepth) {
      seen.add(path);
      console.log("  ".repeat(stack.length) + tag);
    }

    if (!isSelfClosing) {
      stack.push(tag);
    }
  }
}

async function findSamples(cik: string, forms: string[], limit: number): Promise<SampleFiling[]> {
  const url = `https://data.sec.gov/submissions/CIK${formatCik(cik)}.json`;
  const res = await fetchSec(url, { headers: { Accept: "application/json" } });
  const data = (await res.json()) as {
    filings: {
      recent: {
        form: string[];
        accessionNumber: string[];
        filingDate: string[];
        primaryDocument: string[];
      };
    };
  };

  const recent = data.filings.recent;
  const samples: SampleFiling[] = [];

  for (let i = 0; i < recent.form.length; i++) {
    if (!forms.includes(recent.form[i])) continue;
    samples.push({
      cik,
      form: recent.form[i],
      accession: recent.accessionNumber[i],
      filed: recent.filingDate[i],
      primary: recent.primaryDocument[i],
    });
    if (samples.length >= limit) break;
  }

  return samples;
}

async function listFilingDocuments(
  cik: string,
  accession: string,
): Promise<Array<{ name: string; type?: string }>> {
  const indexUrl = filingIndexJsonUrl(cik, accession);
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

  const { filingIndexUrl } = await import("../src/lib/edgar/constants");
  const cheerio = await import("cheerio");
  const htmlRes = await fetchSec(filingIndexUrl(cik, accession));
  const html = await htmlRes.text();
  const $ = cheerio.load(html);
  const items: Array<{ name: string; type?: string }> = [];

  $("table a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.includes("-index")) return;
    const name = href.split("/").pop();
    if (name) items.push({ name });
  });

  return items;
}

function pickRawOwnershipXml(
  items: Array<{ name: string; type?: string }>,
): string | undefined {
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

async function main(): Promise<void> {
  const companies = [
    { cik: "320193", label: "AAPL" },
    { cik: "789019", label: "MSFT" },
    { cik: "1045810", label: "NVDA" },
  ];

  const samples: SampleFiling[] = [];
  for (const company of companies) {
    const found = await findSamples(company.cik, ["4", "4/A", "3", "5"], 2);
    samples.push(...found);
    if (samples.length >= 5) break;
  }

  console.log("Samples:", JSON.stringify(samples, null, 2));

  for (const sample of samples.slice(0, 5)) {
    const items = await listFilingDocuments(sample.cik, sample.accession);
    const rawXmlName = pickRawOwnershipXml(items);

    if (!rawXmlName) {
      console.log(`\nNo raw XML found for ${sample.accession}. Index items:`, items.map((i) => i.name));
      continue;
    }

    const docUrl = filingDocumentUrl(sample.cik, sample.accession, rawXmlName);
    console.log(`\n${"=".repeat(72)}`);
    console.log(`${sample.form} | ${sample.accession} | raw: ${rawXmlName} (primary was ${sample.primary})`);
    console.log(docUrl);

    const docRes = await fetchSec(docUrl);
    const text = await docRes.text();
    console.log(`Status: ${docRes.status} | Length: ${text.length}`);

    const tags = [...collectElements(text).entries()].sort((a, b) => a[0].localeCompare(b[0]));
    console.log(`\nUnique tags (${tags.length}):`);
    console.log(tags.map(([t, c]) => `${t}:${c}`).join(", "));

    console.log("\nElement tree (first occurrence path):");
    printTree(text);

    const footnoteLines = text.split("\n").filter((l) => /footnote/i.test(l));
    console.log(`\nFootnote-related lines (${footnoteLines.length}):`);
    console.log(footnoteLines.slice(0, 8).join("\n") || "(none)");

    const ruleLines = text.split("\n").filter((l) => /10b5|aff10|rule10/i.test(l));
    console.log(`\n10b5-1 related lines (${ruleLines.length}):`);
    console.log(ruleLines.slice(0, 8).join("\n") || "(none)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
