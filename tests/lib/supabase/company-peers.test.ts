import { describe, expect, it } from "vitest";
import { storedPeersToPeerEntries, type StoredPeerRow } from "@/lib/supabase/company-peers";

describe("company-peers", () => {
  it("maps stored peer rows to peer entries", () => {
    const rows: StoredPeerRow[] = [
      {
        cik: "0000106040",
        entityName: "Western Digital Corporation",
        ticker: "WDC",
        selectionMethod: "yahoo",
        sortOrder: 0,
        score: 0.15,
      },
      {
        cik: "0001137789",
        entityName: "Seagate Technology Holdings plc",
        ticker: "STX",
        selectionMethod: "yahoo",
        sortOrder: 1,
        score: 0.13,
      },
    ];

    expect(storedPeersToPeerEntries(rows)).toEqual([
      {
        cik: "0000106040",
        entityName: "Western Digital Corporation",
        ticker: "WDC",
        selectionMethod: "yahoo",
      },
      {
        cik: "0001137789",
        entityName: "Seagate Technology Holdings plc",
        ticker: "STX",
        selectionMethod: "yahoo",
      },
    ]);
  });
});
