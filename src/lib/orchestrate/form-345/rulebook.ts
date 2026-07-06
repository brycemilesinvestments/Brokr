import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FootnoteCitationEntry, TransactionCodeEntry } from "@/lib/orchestrate/form-345/types";

const RULEBOOK_DIR = join(process.cwd(), "rulebook");

let transactionCodesCache: TransactionCodeEntry[] | null = null;
let footnoteCitationsCache: FootnoteCitationEntry[] | null = null;

function readRulebookJson<T>(filename: string): T {
  const path = join(RULEBOOK_DIR, filename);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as T;
  if (Array.isArray(parsed) && parsed.length === 0) {
    throw new Error(`Rulebook file is empty: ${path}`);
  }
  return parsed;
}

export function loadTransactionCodes(): TransactionCodeEntry[] {
  if (!transactionCodesCache) {
    transactionCodesCache = readRulebookJson<TransactionCodeEntry[]>("transaction_codes.json");
  }
  return transactionCodesCache;
}

export function loadFootnoteCitations(): FootnoteCitationEntry[] {
  if (!footnoteCitationsCache) {
    footnoteCitationsCache = readRulebookJson<FootnoteCitationEntry[]>("footnote_citations.json");
  }
  return footnoteCitationsCache;
}

export function lookupTransactionCode(code: string): TransactionCodeEntry | undefined {
  return loadTransactionCodes().find((entry) => entry.code === code.toUpperCase());
}

export function resetRulebookCache(): void {
  transactionCodesCache = null;
  footnoteCitationsCache = null;
}

export function rulebookExists(): boolean {
  try {
    loadTransactionCodes();
    loadFootnoteCitations();
    return true;
  } catch {
    return false;
  }
}
