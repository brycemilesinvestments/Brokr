import type { PeerComparisonBundle } from "@/lib/peers/types";

export const PEER_DISPLAY_METRICS = [
  "gross_margin",
  "net_margin",
  "operating_margin",
  "current_ratio",
  "debt_to_equity",
  "fcf_margin",
] as const;

export type PeerComparisonPayload =
  | { status: "ok"; bundle: PeerComparisonBundle }
  | {
      status: "insufficient_peers";
      targetCik: string;
      targetEntityName: string;
      peerCount: number;
      sic?: string;
      /** Peers resolved but too few had comparable metric data. */
      reason?: "insufficient_peer_data";
      metricsWithData?: number;
      metricsRequired?: number;
    };
