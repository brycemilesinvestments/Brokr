import { createHash } from "node:crypto";

/** Stable hash of ingested document accessions; changes when filings are added. */
export function buildSourceFingerprint(accessions: string[]): string {
  if (accessions.length === 0) return "none";
  const sorted = [...accessions].sort();
  return createHash("sha256").update(sorted.join("|")).digest("hex");
}
