import type { FilingRef } from "@/lib/edgar/types";
import type { CanonicalForm, FilingPair } from "@/lib/filing-diff/types";

function toCanonicalForm(form: string): CanonicalForm | null {
  const upper = form.toUpperCase();
  if (upper.startsWith("10-Q")) return "10-Q";
  if (upper.startsWith("10-K")) return "10-K";
  return null;
}

function quarterFromDate(dateString: string): number | null {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

function yearFromDate(dateString: string): number | null {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
}

function sortByFilingDateDesc(items: FilingRef[]): FilingRef[] {
  return [...items].sort((a, b) => b.filingDate.localeCompare(a.filingDate));
}

/** F1 — Pair a filing with its comparison baseline (10-Q YoY quarter or prior 10-K). */
export function pairFilings(
  cik: string,
  filings: FilingRef[],
  accessionNumber: string,
): FilingPair | null {
  const current = filings.find((f) => f.accessionNumber === accessionNumber);
  if (!current) return null;

  const form = toCanonicalForm(current.form);
  if (!form) return null;

  const anchorDate = current.reportDate ?? current.filingDate;
  const currentYear = yearFromDate(anchorDate);
  if (currentYear === null) return null;

  const sameForm = filings.filter((f) => {
    if (f.accessionNumber === accessionNumber) return false;
    return toCanonicalForm(f.form) === form;
  });

  let candidates: FilingRef[];
  if (form === "10-Q") {
    const currentQuarter = quarterFromDate(anchorDate);
    if (currentQuarter === null) return null;
    candidates = sameForm.filter((f) => {
      const date = f.reportDate ?? f.filingDate;
      return (
        yearFromDate(date) === currentYear - 1 &&
        quarterFromDate(date) === currentQuarter
      );
    });
  } else {
    candidates = sameForm.filter((f) => {
      const date = f.reportDate ?? f.filingDate;
      return yearFromDate(date) === currentYear - 1;
    });
  }

  const previous = sortByFilingDateDesc(candidates)[0];
  if (!previous) return null;

  return { cik, form, current, previous };
}
