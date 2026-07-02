import type { InsiderTransaction } from "@/lib/edgar";
import type {
  InsiderEvent,
  InsiderSignalClass,
  InsiderTransactionCode,
} from "@/lib/insider/types";

export function parseTransactionCode(
  transactionType?: string,
): InsiderTransactionCode | null {
  if (!transactionType) return null;
  const trimmed = transactionType.trim();
  const match = trimmed.match(/^([FPASGJC])/i);
  if (!match) return null;
  return match[1].toUpperCase() as InsiderTransactionCode;
}

export function classifyTransactionCode(
  code: InsiderTransactionCode,
  acquiredOrDisposed?: "A" | "D",
): InsiderSignalClass {
  if (code === "P") return "signal";
  if (code === "S" && acquiredOrDisposed === "D") return "signal";
  return "noise";
}

export function classifyTransaction(transaction: InsiderTransaction): {
  code: InsiderTransactionCode | null;
  classification: InsiderSignalClass;
} {
  const code = parseTransactionCode(transaction.transactionType);
  if (!code) {
    return { code: null, classification: "noise" };
  }

  return {
    code,
    classification: classifyTransactionCode(code, transaction.acquiredOrDisposed),
  };
}

export function buildInsiderEvent(
  transaction: InsiderTransaction,
  filingDate: string,
): InsiderEvent | null {
  const { code, classification } = classifyTransaction(transaction);
  if (!code) return null;

  return {
    transaction,
    filingDate,
    eventDate: filingDate,
    classification,
    transactionCode: code,
  };
}

export type FilingDateAlignmentResult =
  | { valid: true }
  | { valid: false; reason: string };

/** C9.2 — Reject events aligned on transaction date instead of filing date. */
export function validateFilingDateAlignment(
  filingDate: string,
  transactionDate: string,
  eventDate: string,
): FilingDateAlignmentResult {
  if (eventDate === transactionDate && filingDate !== transactionDate) {
    return {
      valid: false,
      reason:
        "transaction-date alignment rejected: eventDate matches transactionDate but differs from filingDate",
    };
  }

  if (eventDate !== filingDate) {
    return {
      valid: false,
      reason:
        "eventDate must equal filingDate (t=0 is filing date, not transaction date)",
    };
  }

  return { valid: true };
}
