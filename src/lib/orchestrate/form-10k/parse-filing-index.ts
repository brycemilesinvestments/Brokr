import type { FilingIndexItem } from "@/lib/orchestrate/form-8k/parse-filing-index";

function matchesDocType(type: string | undefined, pattern: RegExp): boolean {
  return pattern.test((type ?? "").trim());
}

export function pick10kPrimaryDocument(items: FilingIndexItem[]): FilingIndexItem | null {
  return (
    items.find((item) => matchesDocType(item.type, /^10-K/i)) ??
    items.find(
      (item) =>
        /\.htm/i.test(item.name ?? "") &&
        /10-k/i.test(item.description ?? item.name ?? ""),
    ) ??
    items.find((item) => /\.htm/i.test(item.name ?? "")) ??
    null
  );
}
