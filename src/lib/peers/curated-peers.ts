import { formatCik } from "@/lib/edgar/constants";

export type CuratedPeer = {
  cik: string;
  entityName: string;
};

/**
 * Curated peer overrides for targets where SIC-only matching pulls defunct shells.
 * Used before SIC discovery; SIC fill is fallback only when curated list is absent.
 */
export const CURATED_PEER_OVERRIDES: Record<string, CuratedPeer[]> = {
  /** Sandisk Corporation — storage / memory semiconductors */
  [formatCik("2023554")]: [
    { cik: formatCik("723125"), entityName: "Micron Technology, Inc." },
    { cik: formatCik("106040"), entityName: "WESTERN DIGITAL CORPORATION" },
    { cik: formatCik("1137789"), entityName: "Seagate Technology Holdings plc" },
  ],
};

export function getCuratedPeers(targetCik: string): CuratedPeer[] {
  return CURATED_PEER_OVERRIDES[formatCik(targetCik)] ?? [];
}
