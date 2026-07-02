export type XbrlContext = {
  id: string;
  entityIdentifier?: string;
  entityScheme?: string;
  periodType: "instant" | "duration";
  startDate?: string;
  endDate?: string;
  instant?: string;
};

export type XbrlUnit = {
  id: string;
  measure: string;
};

export type XbrlFact = {
  id?: string;
  name: string;
  taxonomy: string;
  concept: string;
  value: string;
  numericValue?: number;
  contextRef: string;
  unitRef?: string;
  decimals?: string;
  scale?: string;
  format?: string;
  context?: XbrlContext;
  unit?: string;
};

export type XbrlDocumentExtraction = {
  documentName: string;
  documentUrl: string;
  documentType?: string;
  contexts: XbrlContext[];
  units: XbrlUnit[];
  facts: XbrlFact[];
};

export type FilingXbrlExtraction = {
  cik: string;
  accessionNumber: string;
  documents: XbrlDocumentExtraction[];
  totalFacts: number;
};
