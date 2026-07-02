import { describe, expect, it, vi } from "vitest";
import { dedup } from "@/lib/watchlist/dedup";
import { detectNewFilings } from "@/lib/watchlist/detect-new-filings";
import { emitAlerts } from "@/lib/watchlist/emit-alerts";
import { evalInsider } from "@/lib/watchlist/eval-insider";
import { evalThresholds } from "@/lib/watchlist/eval-thresholds";
import { loadWatchlist } from "@/lib/watchlist/load-watchlist";
import { runWatchlistRouter } from "@/lib/watchlist/router";
import type {
  FilingInput,
  InsiderTransactionInput,
  MetricPoint,
  StructuredAlert,
  WatchlistEntry,
} from "@/lib/watchlist/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEntry(
  cik: string,
  triggers: WatchlistEntry["triggerConfig"]["triggers"],
): WatchlistEntry {
  return {
    id: "test-id",
    cik,
    triggerConfig: { triggers },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const CIK = "0000320193"; // AAPL-like placeholder

// ── W1: loadWatchlist ─────────────────────────────────────────────────────────

describe("loadWatchlist (W1)", () => {
  it("maps store rows to domain entries with trigger config", () => {
    const rows = [
      {
        id: "id-1",
        cik: "0000320193",
        trigger_config: {
          triggers: [{ kind: "new_filing", formTypes: ["10-K"] }],
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    ];

    const entries = loadWatchlist(rows);
    expect(entries).toHaveLength(1);
    expect(entries[0].cik).toBe("0000320193");
    expect(entries[0].triggerConfig.triggers[0].kind).toBe("new_filing");
  });

  it("sorts entries deterministically by CIK", () => {
    const rows = [
      {
        id: "b",
        cik: "0000000002",
        trigger_config: { triggers: [] },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "a",
        cik: "0000000001",
        trigger_config: { triggers: [] },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const entries = loadWatchlist(rows);
    expect(entries.map((e) => e.cik)).toEqual(["0000000001", "0000000002"]);
  });

  it("returns empty triggers when trigger_config is malformed", () => {
    const entries = loadWatchlist([
      {
        id: "x",
        cik: "0000000001",
        trigger_config: {},
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(entries[0].triggerConfig.triggers).toEqual([]);
  });
});

// ── W2: detect_new_filings ────────────────────────────────────────────────────

describe("detectNewFilings (W2)", () => {
  const filing: FilingInput = {
    accessionNumber: "0001234567-26-000001",
    form: "10-K",
    filingDate: "2026-06-01",
  };

  it("fires for a filing not in seenAccessions", () => {
    const entry = makeEntry(CIK, [{ kind: "new_filing" }]);
    const alerts = detectNewFilings(entry, [filing], new Set());
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("new_filing");
    expect(alerts[0].accessionNumber).toBe(filing.accessionNumber);
    expect(alerts[0].eventKey).toContain(filing.accessionNumber);
  });

  it("is idempotent — does NOT re-fire when accession is already seen", () => {
    const entry = makeEntry(CIK, [{ kind: "new_filing" }]);
    const seen = new Set([filing.accessionNumber]);
    const alerts = detectNewFilings(entry, [filing], seen);
    expect(alerts).toHaveLength(0);
  });

  it("respects formTypes filter — ignores non-matching forms", () => {
    const entry = makeEntry(CIK, [{ kind: "new_filing", formTypes: ["4"] }]);
    const alerts = detectNewFilings(entry, [filing], new Set());
    expect(alerts).toHaveLength(0);
  });

  it("passes formTypes filter when form matches", () => {
    const entry = makeEntry(CIK, [{ kind: "new_filing", formTypes: ["10-K"] }]);
    const alerts = detectNewFilings(entry, [filing], new Set());
    expect(alerts).toHaveLength(1);
  });

  it("returns nothing when there is no new_filing trigger", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: 0 },
    ]);
    const alerts = detectNewFilings(entry, [filing], new Set());
    expect(alerts).toHaveLength(0);
  });

  it("generates a stable, deterministic eventKey", () => {
    const entry = makeEntry(CIK, [{ kind: "new_filing" }]);
    const a = detectNewFilings(entry, [filing], new Set());
    const b = detectNewFilings(entry, [filing], new Set());
    expect(a[0].eventKey).toBe(b[0].eventKey);
    expect(a[0].eventKey).toBe(`new_filing:${CIK}:${filing.accessionNumber}`);
  });
});

// ── W3: eval_thresholds ───────────────────────────────────────────────────────

describe("evalThresholds (W3)", () => {
  const series: MetricPoint[] = [
    { periodEnd: "2025-12-31", value: 0.12 },
    { periodEnd: "2026-03-31", value: -0.03 },
  ];

  it("fires when net_margin < threshold (lt operator)", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: 0.0 },
    ]);
    const alerts = evalThresholds(entry, { net_margin: series });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("threshold_crossed");
    expect(alerts[0].metric).toBe("net_margin");
    expect(alerts[0].value).toBeCloseTo(-0.03);
  });

  it("does NOT fire when net_margin is above threshold", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: -0.1 },
    ]);
    const alerts = evalThresholds(entry, { net_margin: series });
    expect(alerts).toHaveLength(0);
  });

  it("fires for the gt operator when value exceeds threshold", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "debt_to_equity", operator: "gt", value: 2.0 },
    ]);
    const deSeries: MetricPoint[] = [
      { periodEnd: "2026-03-31", value: 3.5 },
    ];
    const alerts = evalThresholds(entry, { debt_to_equity: deSeries });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].value).toBeCloseTo(3.5);
  });

  it("fires for drop operator when decline meets threshold", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "health_score", operator: "drop", value: 10 },
    ]);
    const healthSeries: MetricPoint[] = [
      { periodEnd: "2025-12-31", value: 75 },
      { periodEnd: "2026-03-31", value: 60 },
    ];
    const alerts = evalThresholds(entry, { health_score: healthSeries });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].operator).toBe("drop");
    // drop = 75 − 60 = 15, threshold = 10 → fires
  });

  it("does NOT fire for drop when decline is below threshold", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "health_score", operator: "drop", value: 20 },
    ]);
    const healthSeries: MetricPoint[] = [
      { periodEnd: "2025-12-31", value: 75 },
      { periodEnd: "2026-03-31", value: 60 },
    ];
    // drop = 15, threshold = 20 → does NOT fire
    const alerts = evalThresholds(entry, { health_score: healthSeries });
    expect(alerts).toHaveLength(0);
  });

  it("fires for FCF negative (lt 0)", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "fcf", operator: "lt", value: 0 },
    ]);
    const fcfSeries: MetricPoint[] = [
      { periodEnd: "2026-03-31", value: -500_000 },
    ];
    const alerts = evalThresholds(entry, { fcf: fcfSeries });
    expect(alerts).toHaveLength(1);
  });

  it("returns empty when series is missing", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: 0 },
    ]);
    const alerts = evalThresholds(entry, {});
    expect(alerts).toHaveLength(0);
  });

  it("generates a deterministic eventKey scoped to periodEnd", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: 0.0 },
    ]);
    const a = evalThresholds(entry, { net_margin: series });
    const b = evalThresholds(entry, { net_margin: series });
    expect(a[0].eventKey).toBe(b[0].eventKey);
    expect(a[0].eventKey).toContain("2026-03-31");
  });

  it("threshold fires once per period — crossing the same level again on the same periodEnd is one event", () => {
    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: 0.0 },
    ]);
    const alerts1 = evalThresholds(entry, { net_margin: series });
    const alerts2 = evalThresholds(entry, { net_margin: series });
    // Same eventKey both times — dedup will collapse them
    expect(alerts1[0].eventKey).toBe(alerts2[0].eventKey);
  });
});

// ── W4: eval_insider ─────────────────────────────────────────────────────────

describe("evalInsider (W4)", () => {
  const purchase: InsiderTransactionInput = {
    reportingOwner: "Tim Apple",
    transactionDate: "2026-06-15",
    transactionType: "P-Purchase",
    acquiredOrDisposed: "A",
    sharesTransacted: 5000,
    accessionNumber: "0001234567-26-000002",
  };

  const fInKind: InsiderTransactionInput = {
    reportingOwner: "Tim Apple",
    transactionDate: "2026-06-15",
    transactionType: "F-InKind",
    acquiredOrDisposed: "D",
    sharesTransacted: 2000,
  };

  const fPlainCode: InsiderTransactionInput = {
    reportingOwner: "Jony Ive",
    transactionDate: "2026-06-16",
    transactionType: "F",
    acquiredOrDisposed: "D",
    sharesTransacted: 1000,
  };

  const sale: InsiderTransactionInput = {
    reportingOwner: "Jony Ive",
    transactionDate: "2026-06-16",
    transactionType: "S-Sale",
    acquiredOrDisposed: "D",
    sharesTransacted: 10000,
  };

  it("fires for code P (open-market purchase)", () => {
    const entry = makeEntry(CIK, [{ kind: "insider_purchase" }]);
    const alerts = evalInsider(entry, [purchase]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("insider_purchase");
    expect(alerts[0].reportingOwner).toBe("Tim Apple");
  });

  it("does NOT fire for F-InKind (code F)", () => {
    const entry = makeEntry(CIK, [{ kind: "insider_purchase" }]);
    const alerts = evalInsider(entry, [fInKind]);
    expect(alerts).toHaveLength(0);
  });

  it("does NOT fire for bare F code", () => {
    const entry = makeEntry(CIK, [{ kind: "insider_purchase" }]);
    const alerts = evalInsider(entry, [fPlainCode]);
    expect(alerts).toHaveLength(0);
  });

  it("does NOT fire for a sale (code S)", () => {
    const entry = makeEntry(CIK, [{ kind: "insider_purchase" }]);
    const alerts = evalInsider(entry, [sale]);
    expect(alerts).toHaveLength(0);
  });

  it("respects minShares filter — ignores purchases below threshold", () => {
    const entry = makeEntry(CIK, [
      { kind: "insider_purchase", minShares: 10_000 },
    ]);
    const alerts = evalInsider(entry, [purchase]); // 5000 < 10000
    expect(alerts).toHaveLength(0);
  });

  it("passes minShares filter when shares meet threshold", () => {
    const entry = makeEntry(CIK, [
      { kind: "insider_purchase", minShares: 5000 },
    ]);
    const alerts = evalInsider(entry, [purchase]); // 5000 >= 5000
    expect(alerts).toHaveLength(1);
  });

  it("only fires for P transactions in a mixed list", () => {
    const entry = makeEntry(CIK, [{ kind: "insider_purchase" }]);
    const alerts = evalInsider(entry, [purchase, fInKind, fPlainCode, sale]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].reportingOwner).toBe("Tim Apple");
  });

  it("generates a deterministic eventKey", () => {
    const entry = makeEntry(CIK, [{ kind: "insider_purchase" }]);
    const a = evalInsider(entry, [purchase]);
    const b = evalInsider(entry, [purchase]);
    expect(a[0].eventKey).toBe(b[0].eventKey);
    expect(a[0].eventKey).toContain(purchase.accessionNumber);
  });

  it("returns nothing when there is no insider_purchase trigger", () => {
    const entry = makeEntry(CIK, [{ kind: "new_filing" }]);
    const alerts = evalInsider(entry, [purchase]);
    expect(alerts).toHaveLength(0);
  });
});

// ── W5: dedup ─────────────────────────────────────────────────────────────────

describe("dedup (W5)", () => {
  const makeAlert = (key: string): StructuredAlert => ({
    type: "new_filing",
    cik: CIK,
    accessionNumber: key,
    form: "10-K",
    filingDate: "2026-06-01",
    eventKey: `new_filing:${CIK}:${key}`,
  });

  it("passes through alerts with no prior fired keys", () => {
    const candidates = [makeAlert("aaa"), makeAlert("bbb")];
    const { newAlerts, newFiredKeys } = dedup(candidates, new Set());
    expect(newAlerts).toHaveLength(2);
    expect(newFiredKeys).toHaveLength(2);
  });

  it("suppresses alerts whose eventKey is already in firedEventKeys", () => {
    const a = makeAlert("aaa");
    const b = makeAlert("bbb");
    const fired = new Set([a.eventKey]);
    const { newAlerts } = dedup([a, b], fired);
    expect(newAlerts).toHaveLength(1);
    expect(newAlerts[0].eventKey).toBe(b.eventKey);
  });

  it("collapses duplicates within the same poll run", () => {
    const a = makeAlert("aaa");
    const candidates = [a, a]; // same alert twice
    const { newAlerts, newFiredKeys } = dedup(candidates, new Set());
    expect(newAlerts).toHaveLength(1);
    expect(newFiredKeys).toHaveLength(1);
  });

  it("on re-poll: all candidates already fired → empty result", () => {
    const a = makeAlert("aaa");
    const b = makeAlert("bbb");
    const fired = new Set([a.eventKey, b.eventKey]);
    const { newAlerts, newFiredKeys } = dedup([a, b], fired);
    expect(newAlerts).toHaveLength(0);
    expect(newFiredKeys).toHaveLength(0);
  });

  it("is deterministic — same input always produces same output", () => {
    const candidates = [makeAlert("aaa"), makeAlert("bbb"), makeAlert("ccc")];
    const fired = new Set(["new_filing:0000320193:bbb"]);
    const r1 = dedup(candidates, fired);
    const r2 = dedup(candidates, fired);
    expect(r1.newFiredKeys).toEqual(r2.newFiredKeys);
    expect(r1.newAlerts.map((a) => a.eventKey)).toEqual(
      r2.newAlerts.map((a) => a.eventKey),
    );
  });
});

// ── W6: emitAlerts ────────────────────────────────────────────────────────────

describe("emitAlerts (W6)", () => {
  it("calls emitter for each alert in order", async () => {
    const delivered: StructuredAlert[] = [];
    const emitter = (a: StructuredAlert) => {
      delivered.push(a);
    };

    const alerts: StructuredAlert[] = [
      {
        type: "new_filing",
        cik: CIK,
        accessionNumber: "aaa",
        form: "10-K",
        filingDate: "2026-06-01",
        eventKey: "key-1",
      },
      {
        type: "insider_purchase",
        cik: CIK,
        reportingOwner: "Tim Apple",
        transactionDate: "2026-06-15",
        eventKey: "key-2",
      },
    ];

    await emitAlerts(alerts, emitter);
    expect(delivered).toHaveLength(2);
    expect(delivered[0].eventKey).toBe("key-1");
    expect(delivered[1].eventKey).toBe("key-2");
  });

  it("does nothing when alerts list is empty", async () => {
    const emitter = vi.fn();
    await emitAlerts([], emitter);
    expect(emitter).not.toHaveBeenCalled();
  });

  it("collects errors and rethrows as AggregateError after all deliveries", async () => {
    let callCount = 0;
    const emitter = () => {
      callCount++;
      throw new Error("delivery failed");
    };

    const alerts: StructuredAlert[] = [
      {
        type: "new_filing",
        cik: CIK,
        accessionNumber: "aaa",
        form: "10-K",
        filingDate: "2026-06-01",
        eventKey: "key-1",
      },
      {
        type: "new_filing",
        cik: CIK,
        accessionNumber: "bbb",
        form: "10-K",
        filingDate: "2026-06-01",
        eventKey: "key-2",
      },
    ];

    await expect(emitAlerts(alerts, emitter)).rejects.toBeInstanceOf(
      AggregateError,
    );
    // All alerts were attempted despite the first failure.
    expect(callCount).toBe(2);
  });
});

// ── Router integration ────────────────────────────────────────────────────────

describe("runWatchlistRouter (integration)", () => {
  it("full pipeline: new filing → dedup → emit", async () => {
    const delivered: StructuredAlert[] = [];
    const emitter = (a: StructuredAlert) => {
      delivered.push(a);
    };

    const filing: FilingInput = {
      accessionNumber: "0001234567-26-000099",
      form: "10-Q",
      filingDate: "2026-06-15",
    };

    const result = await runWatchlistRouter({
      entries: [makeEntry(CIK, [{ kind: "new_filing" }])],
      filingsByCik: { [CIK]: [filing] },
      seenAccessionsByCik: { [CIK]: new Set() },
      firedEventKeys: new Set(),
      emitter,
    });

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe("new_filing");
    expect(result.newSeenAccessions[CIK]).toContain(filing.accessionNumber);
    expect(result.newFiredEventKeys).toHaveLength(1);
    expect(delivered).toHaveLength(1);
  });

  it("idempotent across polls — re-poll with seen accessions produces no alerts", async () => {
    const delivered: StructuredAlert[] = [];
    const emitter = (a: StructuredAlert) => {
      delivered.push(a);
    };

    const filing: FilingInput = {
      accessionNumber: "0001234567-26-000099",
      form: "10-Q",
      filingDate: "2026-06-15",
    };

    const eventKey = `new_filing:${CIK}:${filing.accessionNumber}`;

    const result = await runWatchlistRouter({
      entries: [makeEntry(CIK, [{ kind: "new_filing" }])],
      filingsByCik: { [CIK]: [filing] },
      seenAccessionsByCik: { [CIK]: new Set([filing.accessionNumber]) },
      firedEventKeys: new Set([eventKey]),
      emitter,
    });

    expect(result.alerts).toHaveLength(0);
    expect(delivered).toHaveLength(0);
  });

  it("threshold crossing fires once; re-poll with firedEventKeys suppresses it", async () => {
    const delivered: StructuredAlert[] = [];
    const emitter = (a: StructuredAlert) => {
      delivered.push(a);
    };

    const entry = makeEntry(CIK, [
      { kind: "threshold", metric: "net_margin", operator: "lt", value: 0.0 },
    ]);
    const series: MetricPoint[] = [{ periodEnd: "2026-03-31", value: -0.05 }];

    const result1 = await runWatchlistRouter({
      entries: [entry],
      filingsByCik: {},
      seenAccessionsByCik: {},
      metricSeriesByCik: { [CIK]: { net_margin: series } },
      firedEventKeys: new Set(),
      emitter,
    });

    expect(result1.alerts).toHaveLength(1);
    const firedKey = result1.newFiredEventKeys[0];

    // Second poll: same data, but firedKey is now known.
    delivered.length = 0;
    const result2 = await runWatchlistRouter({
      entries: [entry],
      filingsByCik: {},
      seenAccessionsByCik: {},
      metricSeriesByCik: { [CIK]: { net_margin: series } },
      firedEventKeys: new Set([firedKey]),
      emitter,
    });

    expect(result2.alerts).toHaveLength(0);
    expect(delivered).toHaveLength(0);
  });

  it("insider P fires, F-InKind does not, in a mixed transaction list", async () => {
    const delivered: StructuredAlert[] = [];
    const emitter = (a: StructuredAlert) => {
      delivered.push(a);
    };

    const transactions: InsiderTransactionInput[] = [
      {
        reportingOwner: "Buyer",
        transactionDate: "2026-06-10",
        transactionType: "P-Purchase",
        acquiredOrDisposed: "A",
        sharesTransacted: 1000,
        accessionNumber: "0000000001-26-000001",
      },
      {
        reportingOwner: "Executive",
        transactionDate: "2026-06-10",
        transactionType: "F-InKind",
        acquiredOrDisposed: "D",
        sharesTransacted: 500,
      },
    ];

    const result = await runWatchlistRouter({
      entries: [makeEntry(CIK, [{ kind: "insider_purchase" }])],
      filingsByCik: {},
      seenAccessionsByCik: {},
      transactionsByCik: { [CIK]: transactions },
      firedEventKeys: new Set(),
      emitter,
    });

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe("insider_purchase");
    if (result.alerts[0].type === "insider_purchase") {
      expect(result.alerts[0].reportingOwner).toBe("Buyer");
    }
    expect(delivered).toHaveLength(1);
  });

  it("dedup on re-poll — second poll with same transactions produces no alerts", async () => {
    const delivered: StructuredAlert[] = [];
    const emitter = (a: StructuredAlert) => {
      delivered.push(a);
    };

    const transactions: InsiderTransactionInput[] = [
      {
        reportingOwner: "Buyer",
        transactionDate: "2026-06-10",
        transactionType: "P-Purchase",
        acquiredOrDisposed: "A",
        sharesTransacted: 1000,
        accessionNumber: "0000000001-26-000001",
      },
    ];

    const result1 = await runWatchlistRouter({
      entries: [makeEntry(CIK, [{ kind: "insider_purchase" }])],
      filingsByCik: {},
      seenAccessionsByCik: {},
      transactionsByCik: { [CIK]: transactions },
      firedEventKeys: new Set(),
      emitter,
    });

    expect(result1.alerts).toHaveLength(1);
    const firedKeys = new Set(result1.newFiredEventKeys);

    delivered.length = 0;
    const result2 = await runWatchlistRouter({
      entries: [makeEntry(CIK, [{ kind: "insider_purchase" }])],
      filingsByCik: {},
      seenAccessionsByCik: {},
      transactionsByCik: { [CIK]: transactions },
      firedEventKeys: firedKeys,
      emitter,
    });

    expect(result2.alerts).toHaveLength(0);
    expect(delivered).toHaveLength(0);
  });
});
