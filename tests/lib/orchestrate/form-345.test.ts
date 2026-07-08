import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AiClient } from "@/lib/ai";
import { classifyOwnershipRows } from "@/lib/orchestrate/form-345/classify-transaction";
import { detectVestingEventPairs } from "@/lib/orchestrate/form-345/detect-vesting-pairs";
import {
  extractPlanAdoptionDate,
  hashFootnoteText,
  matchFootnoteCitation,
  normalizeFootnoteText,
} from "@/lib/orchestrate/form-345/footnote-utils";
import { parseOwnershipXml } from "@/lib/orchestrate/form-345/parse-ownership-xml";
import { loadFootnoteCitations, lookupTransactionCode } from "@/lib/orchestrate/form-345/rulebook";

vi.mock("@/lib/supabase/form345", () => ({
  getFootnoteClassification: vi.fn().mockResolvedValue(null),
  upsertFootnoteClassification: vi.fn().mockResolvedValue(undefined),
}));

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

  it("matches gift language beyond 'bona fide gift'", () => {
    const citations = loadFootnoteCitations();
    const match = matchFootnoteCitation(
      "On May 12, 2026, the Reporting Person's Spouse's Trust gifted 9,666 shares to irrevocable trusts for estate planning purposes.",
      citations,
    );
    expect(match?.classification).toBe("routine_gift");
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

  it("parses share amounts when a footnoteId sibling follows the value element", () => {
    const xml = `
      <ownershipDocument>
        <documentType>4</documentType>
        <periodOfReport>2026-06-20</periodOfReport>
        <issuer>
          <issuerCik>0002023554</issuerCik>
          <issuerName>Sandisk Corp</issuerName>
          <issuerTradingSymbol>SNDK</issuerTradingSymbol>
        </issuer>
        <reportingOwner>
          <reportingOwnerId>
            <rptOwnerCik>0002060144</rptOwnerCik>
            <rptOwnerName>Shek Bernard</rptOwnerName>
          </reportingOwnerId>
          <reportingOwnerRelationship>
            <isOfficer>1</isOfficer>
            <officerTitle>Chief Legal Officer &amp; Secty</officerTitle>
          </reportingOwnerRelationship>
        </reportingOwner>
        <aff10b5One>0</aff10b5One>
        <nonDerivativeTable>
          <nonDerivativeTransaction>
            <securityTitle><value>Common Stock</value></securityTitle>
            <transactionDate><value>2026-06-20</value></transactionDate>
            <transactionCoding>
              <transactionFormType>4</transactionFormType>
              <transactionCode>F</transactionCode>
            </transactionCoding>
            <transactionAmounts>
              <transactionShares>
                <value>117</value>
                <footnoteId id="F1"/>
              </transactionShares>
              <transactionPricePerShare><value>2184.75</value></transactionPricePerShare>
              <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
            </transactionAmounts>
            <postTransactionAmounts>
              <sharesOwnedFollowingTransaction><value>32115</value></sharesOwnedFollowingTransaction>
            </postTransactionAmounts>
            <ownershipNature>
              <directOrIndirectOwnership><value>D</value></directOrIndirectOwnership>
            </ownershipNature>
          </nonDerivativeTransaction>
        </nonDerivativeTable>
        <footnotes>
          <footnote id="F1">Payment of tax obligation by withholding securities incident to the vesting of securities in accordance with Rule 16b-3(e).</footnote>
        </footnotes>
      </ownershipDocument>
    `;

    const parsed = parseOwnershipXml(xml);
    const row = parsed.rows[0];

    expect(row.transactionCode).toBe("F");
    expect(row.sharesAmount).toBe(117);
    expect(row.acquiredOrDisposed).toBe("D");
    expect(row.sharesOwnedFollowing).toBe(32115);
    expect(row.footnoteRawText).toContain("Rule 16b-3(e)");
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

describe("form-345 classification", () => {
  function createMockAi(classification: string, rationale: string): AiClient {
    return {
      getModel: () => "claude-haiku-4-5",
      complete: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({ classification, rationale }),
          },
        ],
      }),
    } as unknown as AiClient;
  }

  it("uses code G attribution only when AI is unavailable", async () => {
    const parsed = parseOwnershipXml(`
      <ownershipDocument>
        <documentType>4</documentType>
        <periodOfReport>2026-05-12</periodOfReport>
        <issuer><issuerCik>0002023554</issuerCik><issuerName>Sandisk Corp</issuerName><issuerTradingSymbol>SNDK</issuerTradingSymbol></issuer>
        <reportingOwner>
          <reportingOwnerId><rptOwnerCik>0001342570</rptOwnerCik><rptOwnerName>Caulfield Thomas</rptOwnerName></reportingOwnerId>
          <reportingOwnerRelationship><isDirector>1</isDirector></reportingOwnerRelationship>
        </reportingOwner>
        <aff10b5One>0</aff10b5One>
        <nonDerivativeTable>
          <nonDerivativeTransaction>
            <securityTitle><value>Common Stock</value></securityTitle>
            <transactionDate><value>2026-05-12</value></transactionDate>
            <transactionCoding><transactionCode>G</transactionCode><footnoteId id="F1"/></transactionCoding>
            <transactionAmounts>
              <transactionShares><value>9666</value></transactionShares>
              <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
            </transactionAmounts>
          </nonDerivativeTransaction>
        </nonDerivativeTable>
        <footnotes>
          <footnote id="F1">Shares transferred between affiliated entities for administrative purposes.</footnote>
        </footnotes>
      </ownershipDocument>
    `);

    const { rows } = await classifyOwnershipRows(parsed, { ai: undefined });
    const txn = rows.find((row) => row.transactionCode === "G");

    expect(txn?.footnoteClassification).toBe("routine_gift");
    expect(txn?.needsAiReview).toBe(false);
    expect(txn?.classificationTier).toBe(1);
  });

  it("routes narrative gift footnotes through AI when a client is available", async () => {
    const ai = createMockAi(
      "routine_gift",
      "Spouse trust gifted shares to children's irrevocable trusts for estate planning.",
    );
    const parsed = parseOwnershipXml(`
      <ownershipDocument>
        <documentType>4</documentType>
        <periodOfReport>2026-05-12</periodOfReport>
        <issuer><issuerCik>0002023554</issuerCik><issuerName>Sandisk Corp</issuerName><issuerTradingSymbol>SNDK</issuerTradingSymbol></issuer>
        <reportingOwner>
          <reportingOwnerId><rptOwnerCik>0001342570</rptOwnerCik><rptOwnerName>Caulfield Thomas</rptOwnerName></reportingOwnerId>
          <reportingOwnerRelationship><isDirector>1</isDirector></reportingOwnerRelationship>
        </reportingOwner>
        <aff10b5One>0</aff10b5One>
        <nonDerivativeTable>
          <nonDerivativeTransaction>
            <securityTitle><value>Common Stock</value></securityTitle>
            <transactionDate><value>2026-05-12</value></transactionDate>
            <transactionCoding><transactionCode>G</transactionCode><footnoteId id="F1"/></transactionCoding>
            <transactionAmounts>
              <transactionShares><value>9666</value></transactionShares>
              <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
            </transactionAmounts>
          </nonDerivativeTransaction>
        </nonDerivativeTable>
        <footnotes>
          <footnote id="F1">On May 12, 2026, the Reporting Person's Spouse's Trust gifted 9,666 shares to irrevocable trusts for the benefit of the Reporting Person's children for estate planning purposes. The Reporting Person disclaims beneficial ownership of these shares, which are now held by a third-party trustee, and they are no longer indirectly owned by the Reporting Person.</footnote>
        </footnotes>
      </ownershipDocument>
    `);

    const { rows, stats } = await classifyOwnershipRows(parsed, { ai });
    const txn = rows.find((row) => row.transactionCode === "G");

    expect(stats.tier3Calls).toBe(1);
    expect(ai.complete).toHaveBeenCalledOnce();
    expect(txn?.footnoteClassification).toBe("routine_gift");
    expect(txn?.classificationTier).toBe(3);
    expect(txn?.needsAiReview).toBe(false);
    expect(txn?.aiClassificationText).toContain("estate planning");
  });

  it("skips AI for authoritative regulatory footnote citations", async () => {
    const ai = createMockAi("routine_compensatory", "should not be used");
    const parsed = parseOwnershipXml(`
      <ownershipDocument>
        <documentType>4</documentType>
        <periodOfReport>2026-06-20</periodOfReport>
        <issuer><issuerCik>0002023554</issuerCik><issuerName>Sandisk Corp</issuerName><issuerTradingSymbol>SNDK</issuerTradingSymbol></issuer>
        <reportingOwner>
          <reportingOwnerId><rptOwnerCik>0002060144</rptOwnerCik><rptOwnerName>Shek Bernard</rptOwnerName></reportingOwnerId>
        </reportingOwner>
        <aff10b5One>0</aff10b5One>
        <nonDerivativeTable>
          <nonDerivativeTransaction>
            <securityTitle><value>Common Stock</value></securityTitle>
            <transactionDate><value>2026-06-20</value></transactionDate>
            <transactionCoding><transactionCode>F</transactionCode><footnoteId id="F1"/></transactionCoding>
            <transactionAmounts>
              <transactionShares><value>117</value></transactionShares>
              <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
            </transactionAmounts>
          </nonDerivativeTransaction>
        </nonDerivativeTable>
        <footnotes>
          <footnote id="F1">Payment of tax obligation by withholding securities incident to the vesting of securities in accordance with Rule 16b-3(e).</footnote>
        </footnotes>
      </ownershipDocument>
    `);

    const { rows, stats } = await classifyOwnershipRows(parsed, { ai });
    const txn = rows.find((row) => row.transactionCode === "F");

    expect(stats.tier3Calls).toBe(0);
    expect(ai.complete).not.toHaveBeenCalled();
    expect(txn?.footnoteClassification).toBe("routine_compensatory");
    expect(txn?.classificationTier).toBe(2);
  });
});
