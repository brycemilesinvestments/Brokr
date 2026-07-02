import type { ProseSection, ProseSections } from "@/lib/edgar/discovery";
import { MAX_CHUNK_CHARS, MIN_CHUNK_CHARS } from "@/lib/rag/constants";
import type { FilingChunk } from "@/lib/rag/types";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitOnParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function splitSection(
  section: ProseSection,
  companyId: string,
  accession: string,
  periodEnd: string | null,
): FilingChunk[] {
  const paragraphs = splitOnParagraphs(section.text);
  const chunks: FilingChunk[] = [];
  let buffer = "";
  let chunkIndex = 0;

  function flush() {
    const trimmed = buffer.trim();
    if (trimmed.length < 50) {
      buffer = "";
      return;
    }
    chunks.push({
      companyId,
      accession,
      sectionType: section.key,
      periodEnd,
      chunkIndex,
      text: trimmed,
      tokenCount: estimateTokens(trimmed),
      source: section.source ?? "ixbrl_textblock",
    });
    chunkIndex += 1;
    buffer = "";
  }

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
      flush();
      buffer = paragraph;
    } else if (candidate.length > MAX_CHUNK_CHARS) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
      for (const sentence of sentences) {
        const next = buffer ? `${buffer} ${sentence.trim()}` : sentence.trim();
        if (next.length > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
          flush();
          buffer = sentence.trim();
        } else {
          buffer = next;
        }
      }
    } else {
      buffer = candidate;
    }
  }

  if (buffer.trim()) {
    flush();
  }

  return chunks;
}

/** I1 — Split prose sections into semantically coherent chunks on paragraph/sentence boundaries. */
export function chunkSections(input: {
  companyId: string;
  accession: string;
  periodEnd: string | null;
  proseSections: ProseSections;
  audited?: boolean;
}): FilingChunk[] {
  const sections = Object.values(input.proseSections).filter(
    (s): s is ProseSection => s !== null && s.text.length > 0,
  );

  return sections.flatMap((section) =>
    splitSection(section, input.companyId, input.accession, input.periodEnd).map((chunk) => ({
      ...chunk,
      audited: input.audited,
    })),
  );
}
