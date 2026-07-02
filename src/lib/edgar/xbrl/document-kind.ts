import type { FilingDocument } from "@/lib/edgar/types";

const IXBRL_TYPE_PATTERN = /ixbrl/i;
const XBRL_EXHIBIT_PATTERN = /^EX-101\.(INS|CAL|DEF|LAB|PRE|SCH)$/i;
const XBRL_FILENAME_PATTERN = /\.(xml|xsd)$/i;

export function isXbrlFactDocument(document: FilingDocument): boolean {
  const type = document.type?.trim() ?? "";
  const name = document.documentName.toLowerCase();
  const description = document.description.toLowerCase();

  if (IXBRL_TYPE_PATTERN.test(type)) return true;
  if (IXBRL_TYPE_PATTERN.test(description)) return true;
  if (XBRL_EXHIBIT_PATTERN.test(type)) return type.toUpperCase() === "EX-101.INS";
  if (name.endsWith("_htm.xml") || name.endsWith("-instance.xml")) return true;

  return false;
}

export function isXbrlTaxonomyDocument(document: FilingDocument): boolean {
  const type = document.type?.trim() ?? "";
  if (/^EX-101\.(CAL|DEF|LAB|PRE|SCH)$/i.test(type)) return true;
  return XBRL_FILENAME_PATTERN.test(document.documentName) && !isXbrlFactDocument(document);
}

export function isXbrlRelatedDocument(document: FilingDocument): boolean {
  return isXbrlFactDocument(document) || isXbrlTaxonomyDocument(document);
}
