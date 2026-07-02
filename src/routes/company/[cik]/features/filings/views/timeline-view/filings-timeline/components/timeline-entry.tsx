import Link from "next/link";
import { resolveFilingPagePath } from "@/lib/edgar/constants";
import { CATEGORY_STYLES } from "../constants";
import type { TimelineEntryProps } from "../types";
import { formatDisplayDate } from "../utils/format-display-date";
import { periodLabel } from "../utils/period-label";

export function TimelineEntry({ cik, filing }: TimelineEntryProps) {
  const styles = CATEGORY_STYLES[filing.category];
  const period = periodLabel(filing);
  const filingPageHref = resolveFilingPagePath(cik, filing);

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${styles.dot}`} />
        <div className="mt-1 w-px flex-1 bg-zinc-200 last:hidden" />
      </div>

      <div className="min-w-0 flex-1 -mt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${styles.badge}`}
          >
            {filing.type}
          </span>
          {filing.isAmendment ? (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              Amendment
            </span>
          ) : null}
          {period ? (
            <span className="text-xs font-medium text-zinc-500">{period}</span>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{filing.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>
            <span className="font-medium text-zinc-600">Timeline</span>{" "}
            {formatDisplayDate(filing.timelineDate)}
          </span>
          {filing.reportDate && filing.reportDate !== filing.timelineDate ? (
            <span>
              <span className="font-medium text-zinc-600">Period end</span>{" "}
              {formatDisplayDate(filing.reportDate)}
            </span>
          ) : null}
          <span>
            <span className="font-medium text-zinc-600">Filed</span>{" "}
            {formatDisplayDate(filing.filingDate)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
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
