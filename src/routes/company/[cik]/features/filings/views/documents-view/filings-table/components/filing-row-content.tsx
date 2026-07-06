import Link from "next/link";
import { resolveFilingPagePath } from "@/lib/edgar/constants";
import type { Filing } from "@/routes/company/[cik]/types";

type FilingRowContentProps = {
  cik: string;
  filing: Filing;
  analysisLabel?: string | null;
  analysisLabelTone?: "default" | "error" | "muted";
};

export function FilingRowContent({
  cik,
  filing,
  analysisLabel,
  analysisLabelTone = "default",
}: FilingRowContentProps) {
  const filingPageHref = resolveFilingPagePath(cik, filing);

  return (
    <div className="grid min-w-[720px] grid-cols-[minmax(4rem,8%)_minmax(12rem,36%)_minmax(6rem,12%)_minmax(10rem,22%)_minmax(8rem,22%)] items-center">
      <div className="px-6 py-4 font-mono font-medium text-zinc-900">{filing.type}</div>
      <div className="px-6 py-4 text-zinc-700">
        <div className="flex flex-col gap-1">
          <span>{filing.description}</span>
          {analysisLabel ? (
            <span
              className={
                analysisLabelTone === "error"
                  ? "text-xs font-medium text-red-700"
                  : analysisLabelTone === "muted"
                    ? "text-xs font-medium text-zinc-500"
                    : "text-xs font-medium text-emerald-700"
              }
            >
              {analysisLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="px-6 py-4 whitespace-nowrap text-zinc-600">{filing.filingDate}</div>
      <div className="px-6 py-4 font-mono text-xs text-zinc-500">
        {filing.accessionNumber ?? "—"}
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {filing.documentsUrl ? (
            <a
              href={filing.documentsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Documents
            </a>
          ) : null}
          {filingPageHref ? (
            <Link
              href={filingPageHref}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Filing
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
