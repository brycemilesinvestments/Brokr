import type { ColumnConfig } from "../types";

export const COLUMNS: ColumnConfig[] = [
  { key: "type", label: "Form", getValue: (filing) => filing.type },
  { key: "description", label: "Description", getValue: (filing) => filing.description },
  {
    key: "filingDate",
    label: "Filed",
    getValue: (filing) => filing.filingDate,
    sortMode: "date",
  },
  {
    key: "accessionNumber",
    label: "Accession",
    getValue: (filing) => filing.accessionNumber ?? "—",
  },
];
