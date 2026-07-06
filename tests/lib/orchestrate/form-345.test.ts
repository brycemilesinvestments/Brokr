import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectVestingEventPairs } from "@/lib/orchestrate/form-345/detect-vesting-pairs";
import {
  extractPlanAdoptionDate,
  hashFootnoteText,
  matchFootnoteCitation,
  normalizeFootnoteText,
} from "@/lib/orchestrate/form-345/footnote-utils";
import { parseOwnershipXml } from "@/lib/orchestrate/form-345/parse-ownership-xml";
import { loadFootnoteCitations, lookupTransactionCode } from "@/lib/orchestrate/form-345/rulebook";

const FIXTURE_PATH = join(
  process.cwd(),
  "tests/fixtures/form345/apple-0001140361-26-025620.xml",
);

describe("form-345 rulebook", () => {
  it("loads transaction codes with source URLs", () => {
    const entry = lookupTransactionCode("P");
    expect(entry?.is_routine_default).toBe(false);
    expect(entry?.source_url).toContain("sec.gov");
  });

  it("matches 10b5-1 footnote citations", () => {
    const citations = loadFootnoteCitations();
    const match = matchFootnoteCitation(
      "This transaction was made pursuant to a Rule 10b5-1 trading plan adopted on February 6, 2026.",
      citations,
    );
    expect(match?.classification).toBe("routine_prescheduled");
  });
});

describe("form-345 footnote utils", () => {
  it("normalizes and hashes deterministically", () => {
    const a = hashFootnoteText("  Rule   10b5-1  plan ");
    const b = hashFootnoteText("rule 10b5-1 plan");
    expect(a).toBe(b);
    expect(normalizeFootnoteText("  A\n B ")).toBe("a b");
  });

  it("extracts plan adoption dates", () => {
    const date = extractPlanAdoptionDate(
      "adopted by the Reporting Person on February 6, 2026",
    );
    expect(date).toBe("2026-02-06");
  });
});

describe("form-345 ownership XML parser", () => {
  it("parses confirmed schema elements from a live filing fixture", () => {
    const xml = readFileSync(FIXTURE_PATH, "utf8");
    const parsed = parseOwnershipXml(xml);

    expect(parsed.issuerCik).toBe("0000320193");
    expect(parsed.ticker).toBe("AAPL");
    expect(parsed.is10b51Checkbox).toBe(true);
    expect(parsed.rows.length).toBeGreaterThan(0);

    const sale = parsed.rows.find((row) => row.transactionCode === "S");
    expect(sale?.footnoteRawText).toContain("10b5-1");

    const withholding = parsed.rows.find((row) => row.transactionCode === "F");
    expect(withholding?.acquiredOrDisposed).toBe("D");
  });
});

describe("form-345 vesting pair detection", () => {
  it("tags A+F same-day pairs with a shared vesting_event_id", () => {
    const base = {
      issuerCik: "0000320193",
      issuerName: "Apple Inc.",
      ticker: "AAPL",
      reportingOwnerName: "Test Owner",
      reportingOwnerCik: "0001234567",
      isDirector: false,
      isOfficer: true,
      isTenPctOwner: false,
      isOther: false,
      officerTitle: "CFO",
      securityTitle: "Common Stock",
      isDerivative: false,
      transactionDate: "2026-06-15",
      is10b51Checkbox: false,
      sharesAmount: 100,
      acquiredOrDisposed: "A",
      pricePerShare: null,
      sharesOwnedFollowing: 1000,
      ownershipForm: "D",
      natureOfIndirectOwnership: null,
      footnoteRawText: null,
      footnoteIds: [],
      footnoteHash: null,
      footnoteCitationMatched: null,
      footnoteClassification: "routine_by_code",
      planAdoptionDate: null,
      classificationTier: 1 as const,
      needsAiReview: false,
      aiModelUsed: null,
      aiClassificationText: null,
      vestingEventId: null,
    };

    const rows = [
      { ...base, lineIndex: 0, transactionCode: "A" },
      { ...base, lineIndex: 1, transactionCode: "F", acquiredOrDisposed: "D" },
      { ...base, lineIndex: 2, transactionCode: "S", transactionDate: "2026-06-16" },
    ];

    const paired = detectVestingEventPairs(rows);
    const codeA = paired.find((row) => row.transactionCode === "A");
    const codeF = paired.find((row) => row.transactionCode === "F");
    const codeS = paired.find((row) => row.transactionCode === "S");

    expect(codeA?.vestingEventId).toBeTruthy();
    expect(codeA?.vestingEventId).toBe(codeF?.vestingEventId);
    expect(codeS?.vestingEventId).toBeNull();
  });
});
