import type { FilingDocument } from "@/routes/company/[cik]/filing/[accession]/types";
import type { FilingXbrlExtraction } from "@/lib/edgar/xbrl/types";

export type FilingXbrlProps = {
  cik: string;
  accessionNumber: string;
  documents: FilingDocument[];
  initialExtraction?: FilingXbrlExtraction;
};

export type ViewMode = "statements" | "raw";
