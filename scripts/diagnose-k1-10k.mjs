/**
 * One-off K1 diagnosis for accession 0002023554-25-000034
 * Run: node --env-file=.env.local scripts/diagnose-k1-10k.mjs
 */
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCESSION = "0002023554-25-000034";
const CIK = "0002023554";

// Inline constants from discovery/constants.ts (avoid ts import in mjs)
const PROSE_WHITELIST = {
  business: ["BusinessDescription", "DescriptionOfBusinessTextBlock"],
  mda: ["ManagementDiscussionAndAnalysisTextBlock"],
  risk_factors: ["RiskFactorsTextBlock"],
  financials: ["FinancialStatementsTextBlock", "ConsolidatedFinancialStatementsTextBlock"],
  notes: ["NotesToFinancialStatementsTextBlock", "SignificantAccountingPoliciesTextBlock"],
  auditor: ["AuditOpinionTextBlock", "IndependentAuditorsReportTextBlock", "AuditorsReportTextBlock"],
  controls: [
    "ManagementReportOnInternalControlOverFinancialReportingTextBlock",
    "DisclosureControlsAndProceduresTextBlock",
  ],
  legal: ["LegalProceedingsTextBlock"],
  subsequent_events: ["SubsequentEventsTextBlock"],
  revenue_concentration: [
    "ConcentrationRiskDisclosureTextBlock",
    "ScheduleOfRevenueByMajorCustomersByReportingPeriodsTableTextBlock",
    "RevenueFromContractWithCustomerTextBlock",
  ],
};

const SEC_BASE = "https://www.sec.gov";
function filingDocumentUrl(cik, accessionNumber, filename) {
  const numericCik = String(cik).replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `${SEC_BASE}/Archives/edgar/data/${numericCik}/${accessionPath}/${filename}`;
}

function tagNameOf($, el) {
  if (el.type !== "tag") return "";
  return ($(el).prop("tagName") || "").toUpperCase();
}

function extractIxbrlDiagnostics(markup) {
  const $ = cheerio.load(markup, { xml: { xmlMode: false } });
  const nonNumericElements = [];
  const nonFractionElements = [];
  const allNamedElements = [];

  $("[name]").each((_, el) => {
    const tag = tagNameOf($, el);
    const name = $(el).attr("name");
    if (!name) return;
    const entry = { tag, name, textLen: $(el).text().replace(/\s+/g, " ").trim().length };
    allNamedElements.push(entry);
    if (tag.endsWith("NONNUMERIC")) nonNumericElements.push(entry);
    if (tag.endsWith("NONFRACTION")) nonFractionElements.push(entry);
  });

  // Also count ix:nonNumeric case-insensitive via selector
  const ixNonNumeric = [];
  $("ix\\:nonNumeric, ix\\:nonnumeric, NONNUMERIC").each((_, el) => {
    const name = $(el).attr("name");
    if (name) ixNonNumeric.push({ tag: tagNameOf($, el), name });
  });

  return { nonNumericElements, nonFractionElements, allNamedElements, ixNonNumeric };
}

function splitConcept(name) {
  const colon = name.indexOf(":");
  if (colon === -1) return { taxonomy: "", concept: name };
  return { taxonomy: name.slice(0, colon), concept: name.slice(colon + 1) };
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
  );

  const { data: doc } = await sb
    .from("company_documents")
    .select("*")
    .eq("accession_number", ACCESSION)
    .single();

  console.log("=== 1. DOCUMENT CHECK ===");
  if (!doc) {
    console.log("No company_documents row for", ACCESSION);
    return;
  }
  const primaryFilename = doc.primary_document;
  const exactUrl = filingDocumentUrl(CIK, ACCESSION, primaryFilename);
  console.log("primary_document (DB):", primaryFilename);
  console.log("form_type:", doc.form_type);
  console.log("file_path (storage):", doc.file_path);
  console.log("documents_url (index):", doc.documents_url);
  console.log("EXACT_FETCH_URL:", exactUrl);

  const { data: blob } = await sb.storage.from("edgar").download(doc.file_path);
  const html = blob ? await blob.text() : "";
  console.log("stored_html_bytes:", html.length);
  console.log(
    "is_primary_10k_htm:",
    /10k/i.test(primaryFilename) && /\.htm/i.test(primaryFilename) && !/ex-/i.test(primaryFilename),
  );

  // Parse with same logic as production (import via dynamic ts not available - replicate key checks)
  const diag = extractIxbrlDiagnostics(html);

  console.log("\n=== 2. TEXT BLOCK SEARCH (DOM scan of stored file) ===");
  console.log("elements_with_name_attr:", diag.allNamedElements.length);
  console.log("NONNUMERIC_tag_endswith_matches:", diag.nonNumericElements.length);
  console.log("NONFRACTION_tag_endswith_matches:", diag.nonFractionElements.length);
  console.log("ix:nonNumeric_selector_matches:", diag.ixNonNumeric.length);

  const first10NonNumeric = diag.nonNumericElements.slice(0, 10).map((e) => e.name);
  console.log("first_10_nonNumeric_concept_names:", first10NonNumeric);

  if (diag.nonNumericElements.length === 0 && diag.ixNonNumeric.length > 0) {
    console.log(
      "NOTE: ix:nonNumeric elements exist but parser tagName check may not match (case/namespace)",
    );
    console.log("first_10_ix_nonNumeric:", diag.ixNonNumeric.slice(0, 10).map((e) => e.name));
  }

  // Use production extractIxbrl via compiled approach - load from dist or run with tsx
  // For facts, use the analysis stored xbrlUniverse count as reference and re-parse simply
  const facts = [];
  for (const el of diag.allNamedElements) {
    const { taxonomy, concept } = splitConcept(el.name);
    const isNumeric = el.tag.endsWith("NONFRACTION");
    facts.push({
      name: el.name,
      taxonomy,
      concept,
      value: "(text omitted)",
      numericValue: isNumeric ? 0 : undefined,
      textLen: el.textLen,
      tag: el.tag,
    });
  }

  // Better: fetch production parser output using npx tsx inline
  console.log("\n=== Using production extractIxbrl (tsx) ===");

  const { data: analysis } = await sb
    .from("company_document_analyses")
    .select("result")
    .eq("document_id", doc.id)
    .eq("analysis_type", "form_10k_analysis")
    .maybeSingle();
  console.log("stored_ixbrl_fact_count:", analysis?.result?.xbrlUniverse?.ixbrlFactCount);

  // Run tsx one-liner for production facts
  const { execSync } = await import("node:child_process");
  const tsxScript = `
    import { extractIxbrl } from "./src/lib/edgar/xbrl/extract-ixbrl.ts";
    import { readFileSync, writeFileSync } from "node:fs";
    const html = readFileSync("${join(__dirname, "../.k1-diagnose-html.tmp")}", "utf8");
    const { facts } = extractIxbrl(html);
    writeFileSync("${join(__dirname, "../.k1-diagnose-facts.json")}", JSON.stringify(facts.map(f => ({
      name: f.name, taxonomy: f.taxonomy, concept: f.concept,
      valueLen: f.value?.length ?? 0,
      valuePreview: f.value?.slice(0, 120),
      numericValue: f.numericValue
    })), null, 2));
    console.log("PRODUCTION_FACT_COUNT", facts.length);
    const nonNumeric = facts.filter(f => f.numericValue === undefined && f.value?.trim());
    console.log("PRODUCTION_NON_NUMERIC_COUNT", nonNumeric.length);
    console.log("FIRST_10_NON_NUMERIC", JSON.stringify(nonNumeric.slice(0,10).map(f => f.name)));
  `;
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(__dirname, "../.k1-diagnose-html.tmp"), html);
  writeFileSync(join(__dirname, "../.k1-diagnose-tsx.tmp.mts"), tsxScript);
  try {
    const out = execSync("npx tsx scripts/../.k1-diagnose-tsx.tmp.mts", {
      cwd: join(__dirname, ".."),
      encoding: "utf8",
    });
    console.log(out);
  } catch (e) {
    console.log("tsx failed:", e.message);
  }

  let prodFacts = [];
  try {
    prodFacts = JSON.parse(readFileSync(join(__dirname, "../.k1-diagnose-facts.json"), "utf8"));
  } catch {
    prodFacts = facts;
  }

  console.log("\n=== 3. CONCEPT NAME CHECK ===");
  const flatWhitelist = [...new Set(Object.values(PROSE_WHITELIST).flat())];
  console.log("SECTION_LOCATOR_WHITELIST:", flatWhitelist);

  const textBlockConcepts = prodFacts
    .filter((f) => /TextBlock/i.test(f.concept) || /TextBlock/i.test(f.name))
    .map((f) => `${f.taxonomy}:${f.concept}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  console.log("document_TextBlock_concepts (us-gaap/sndk/dei):", textBlockConcepts);

  const whitelistHits = flatWhitelist.filter((w) =>
    prodFacts.some((f) => f.concept === w && (f.valueLen ?? 0) > 0),
  );
  const whitelistMiss = flatWhitelist.filter((w) => !whitelistHits.includes(w));
  console.log("whitelist_concepts_FOUND_in_facts:", whitelistHits);
  console.log("whitelist_concepts_MISSING:", whitelistMiss);

  console.log("\n=== 4. XBRL FACT SAMPLE (string/text, non-numeric) ===");
  const textFacts = prodFacts
    .filter((f) => f.numericValue === undefined && (f.valueLen ?? 0) > 0)
    .slice(0, 5);
  for (const f of textFacts) {
    console.log({
      name: f.name,
      valueLen: f.valueLen,
      preview: f.valuePreview,
    });
  }

  console.log("\n=== ROOT CAUSE ASSESSMENT ===");
  const reason1 = !/10k/i.test(primaryFilename) || /ex-/i.test(primaryFilename);
  const reason3 = prodFacts.filter((f) => f.numericValue === undefined).length === 0;
  const reason2 =
    !reason3 &&
    textBlockConcepts.length > 0 &&
    whitelistHits.length === 0;
  console.log("Reason 1 (wrong file):", reason1 ? "POSSIBLE" : "unlikely — primary 10-K .htm");
  console.log("Reason 3 (parser strips prose):", reason3 ? "LIKELY" : "unlikely — non-numeric facts exist");
  console.log("Reason 2 (name mismatch):", reason2 ? "LIKELY" : whitelistHits.length > 0 ? "unlikely" : "check lengths/threshold");
}

main().catch(console.error);
