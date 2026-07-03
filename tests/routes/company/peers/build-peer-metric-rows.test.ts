import { describe, expect, it } from "vitest";
import { buildPeerMetricRows } from "@/routes/company/[cik]/features/peers/lib/build-peer-metric-rows";
import type { PeerComparisonBundle } from "@/lib/peers/types";

function makeBundle(): PeerComparisonBundle {
  return {
    targetCik: "0002023554",
    targetEntityName: "Sandisk Corporation",
    peerSet: {
      targetCik: "0002023554",
      targetEntityName: "Sandisk Corporation",
      peers: [
        { cik: "0000106040", entityName: "Western Digital Corporation", ticker: "WDC", selectionMethod: "yahoo" },
        { cik: "0001137789", entityName: "Seagate Technology Holdings plc", ticker: "STX", selectionMethod: "yahoo" },
      ],
      status: "ok",
    },
    relativeMetrics: [
      {
        metricKey: "gross_margin",
        target: [{ calendarKey: "2025", periodEnd: "2025-06-27", value: 0.301, frequency: "annual" }],
        peerBand: [
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: 0.31,
            median: 0.398,
            max: 0.42,
            peers: [
              { cik: "0000106040", entityName: "Western Digital Corporation", value: 0.31, periodEnd: "2025-06-27" },
              { cik: "0001137789", entityName: "Seagate Technology Holdings plc", value: 0.42, periodEnd: "2025-06-27" },
            ],
          },
        ],
        percentileRank: [{ calendarKey: "2025", rank: 0 }],
      },
      {
        metricKey: "current_ratio",
        target: [{ calendarKey: "2025", periodEnd: "2025-06-27", value: 3.564, frequency: "annual" }],
        peerBand: [
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: 1.1,
            median: 1.46,
            max: 2.0,
            peers: [
              { cik: "0000106040", entityName: "Western Digital Corporation", value: 1.1, periodEnd: "2025-06-27" },
              { cik: "0001137789", entityName: "Seagate Technology Holdings plc", value: 2.0, periodEnd: "2025-06-27" },
            ],
          },
        ],
        percentileRank: [{ calendarKey: "2025", rank: 100 }],
      },
    ],
    divergences: [],
    chart: {},
  };
}

describe("buildPeerMetricRows", () => {
  it("builds percentile rows with peer distribution markers", () => {
    const { rows, calendarKey } = buildPeerMetricRows(makeBundle(), "SNDK");

    expect(rows).toHaveLength(2);
    expect(calendarKey).toBe("2025");
    expect(rows[0]?.rank).toBe(0);
    expect(rows[0]?.peerMarkers).toHaveLength(2);
    expect(rows[0]?.peerMarkers[0]?.ticker).toBe("WDC");
    expect(rows[1]?.rank).toBe(100);
    expect(rows[0]?.targetPosition).toBe(0);
    expect(rows[1]?.targetPosition).toBe(100);
  });

  it("positions markers on a value scale that crosses zero for negative margins", () => {
    const bundle = makeBundle();
    bundle.relativeMetrics = [
      {
        metricKey: "net_margin",
        target: [{ calendarKey: "2025", periodEnd: "2025-06-27", value: -0.05, frequency: "annual" }],
        peerBand: [
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: -0.15,
            median: -0.02,
            max: 0.12,
            peers: [
              { cik: "0000106040", entityName: "Western Digital Corporation", value: -0.15, periodEnd: "2025-06-27" },
              { cik: "0001137789", entityName: "Seagate Technology Holdings plc", value: 0.12, periodEnd: "2025-06-27" },
            ],
          },
        ],
        percentileRank: [{ calendarKey: "2025", rank: 50 }],
      },
    ];

    const { rows } = buildPeerMetricRows(bundle, "SNDK");
    const row = rows[0];

    expect(row?.metricKey).toBe("net_margin");
    expect(row?.targetFormatted).toBe("−5.0%");
    expect(row?.zeroPosition).not.toBeNull();
    expect(row?.targetPosition).toBeGreaterThan(0);
    expect(row?.targetPosition).toBeLessThan(100);
    expect(row?.peerMarkers[0]?.position).toBe(0);
    expect(row?.peerMarkers[1]?.position).toBe(100);
  });
});
