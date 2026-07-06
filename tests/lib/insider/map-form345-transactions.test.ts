import { describe, expect, it } from "vitest";
import { mapForm345RowsToInsiderPage } from "@/routes/company/[cik]/features/insider-transactions/lib/map-form345-transactions";
import type { Form345TransactionRow } from "@/lib/supabase/form345";

const sampleRow: Form345TransactionRow = {
  id: 1,
  accession_number: "0001140361-26-025620",
  line_index: 2,
  issuer_cik: "0000320193",
  issuer_name: "Apple Inc.",
  ticker: "AAPL",
  reporting_owner_name: "Borders Ben",
  reporting_owner_cik: "0002100523",
  is_director: false,
  is_officer: true,
  is_ten_pct_owner: false,
  is_other: false,
  officer_title: "Principal Accounting Officer",
  security_title: "Common Stock",
  is_derivative: false,
  transaction_code: "S",
  transaction_date: "2026-06-15",
  is_10b5_1_checkbox: true,
  shares_amount: 1200,
  acquired_or_disposed: "D",
  price_per_share: 296.42,
  shares_owned_following: 38953,
  ownership_form: "D",
  nature_of_indirect_ownership: null,
  footnote_raw_text: "Rule 10b5-1 plan",
  footnote_hash: "abc",
  footnote_citation_matched: "Rule 10b5-1(c)",
  footnote_classification: "routine_prescheduled",
  plan_adoption_date: "2026-02-06",
  classification_tier: 2,
  needs_ai_review: false,
  ai_model_used: null,
  ai_classification_text: null,
  vesting_event_id: null,
  filed_date: "2026-06-17",
};

describe("mapForm345RowsToInsiderPage", () => {
  it("maps stored rows into insider UI transactions", () => {
    const page = mapForm345RowsToInsiderPage("320193", [sampleRow]);

    expect(page.transactions).toHaveLength(1);
    expect(page.transactions[0]?.transactionType).toBe("S");
    expect(page.transactions[0]?.transactionDate).toBe("06/15/2026");
    expect(page.transactions[0]?.accessionNumber).toBe("0001140361-26-025620");
    expect(page.reportingOwners[0]?.ownerName).toBe("Borders Ben");
  });
});
