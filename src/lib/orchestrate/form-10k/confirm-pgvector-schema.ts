import type { FilingChunk } from "@/lib/rag/types";

/** K12 — Confirm chunks carry section_type, audited, and source fields for pgvector retrieval. */
export function confirmPgvectorSchema(chunks: FilingChunk[]): boolean {
  if (chunks.length === 0) return true;
  return chunks.every(
    (chunk) =>
      typeof chunk.sectionType === "string" &&
      chunk.sectionType.length > 0 &&
      typeof chunk.audited === "boolean" &&
      (chunk.source === "ixbrl_textblock" || chunk.source === "html_heading_fallback"),
  );
}
