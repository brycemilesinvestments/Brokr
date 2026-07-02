import { describe, expect, it } from "vitest";
import {
  buildFilingDateLookup,
  resolveInsiderFilingDate,
  toEventStudyTransactions,
} from "@/lib/insider";
import type { InsiderTransaction } from "@/lib/edgar";

describe("event-study-transactions", () => {
  const transaction: InsiderTransaction = {
    transactionDate: "2025-02-14",
    deemedExecutionDate: "2025-02-18",
    reportingOwner: "Jane Doe",
    accessionNumber: "0001628280-25-000101",
    transactionType: "P-Purchase",
    acquiredOrDisposed: "A",
  };

  it("buildFilingDateLookup maps accession numbers to filing dates", () => {
    const lookup = buildFilingDateLookup([
      {
        cik: "0002023554",
        accessionNumber: "0001628280-25-000101",
        form: "4",
        filingDate: "2025-02-18",
      },
    ]);

    expect(lookup.get("0001628280-25-000101")).toBe("2025-02-18");
  });

  it("resolveInsiderFilingDate prefers accession lookup over deemed date", () => {
    const lookup = buildFilingDateLookup([
      {
        cik: "0002023554",
        accessionNumber: "0001628280-25-000101",
        form: "4",
        filingDate: "2025-02-19",
      },
    ]);

    expect(resolveInsiderFilingDate(transaction, lookup)).toBe("2025-02-19");
  });

  it("resolveInsiderFilingDate falls back to deemed execution date", () => {
    expect(resolveInsiderFilingDate(transaction, new Map())).toBe("2025-02-18");
  });

  it("toEventStudyTransactions skips rows without a filing date", () => {
    const withoutDate: InsiderTransaction = {
      transactionDate: "",
      reportingOwner: "Missing",
    };

    const result = toEventStudyTransactions([transaction, withoutDate], new Map());
    expect(result).toHaveLength(1);
    expect(result[0].filingDate).toBe("2025-02-18");
  });
});
