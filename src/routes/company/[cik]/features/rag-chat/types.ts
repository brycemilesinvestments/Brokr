export type RagCitation = {
  accession: string;
  periodEnd: string | null;
  sectionType: string;
  claim: string;
};

export type RagChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: RagCitation[];
  refused?: boolean;
};

export type RagChatResponse = {
  answer: string;
  citations: RagCitation[];
  refused: boolean;
  route: string;
  metricsUsed: Array<{
    metricName: string;
    displayName: string;
    periodEnd: string;
    value: number;
    unit?: string;
  }>;
  embedCalls: number;
  costUsd: number;
};

export type RagChatPanelProps = {
  cik: string;
  companyName?: string;
};
