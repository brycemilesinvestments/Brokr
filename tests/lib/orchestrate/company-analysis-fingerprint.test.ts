import { describe, expect, it } from "vitest";
import { buildSourceFingerprint } from "@/lib/orchestrate/company-analysis-fingerprint";

describe("buildSourceFingerprint", () => {
  it("returns none when no documents are ingested", () => {
    expect(buildSourceFingerprint([])).toBe("none");
  });

  it("is stable regardless of accession order", () => {
    const a = buildSourceFingerprint(["0001234567-24-000001", "0001234567-23-000010"]);
    const b = buildSourceFingerprint(["0001234567-23-000010", "0001234567-24-000001"]);
    expect(a).toBe(b);
  });

  it("changes when a new accession is added", () => {
    const before = buildSourceFingerprint(["0001234567-24-000001"]);
    const after = buildSourceFingerprint(["0001234567-24-000001", "0001234567-24-000002"]);
    expect(before).not.toBe(after);
  });
});
