import { TimelineEntry } from "./timeline-entry";
import type { FiscalYearSectionProps } from "../types";

export function FiscalYearSection({ cik, group }: FiscalYearSectionProps) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-zinc-900">Fiscal Year {group.fiscalYear}</h3>
      <div className="pl-1">
        {group.filings.map((filing) => (
          <TimelineEntry
            key={filing.accessionNumber ?? `${filing.filingDate}-${filing.type}`}
            cik={cik}
            filing={filing}
          />
        ))}
      </div>
    </div>
  );
}
