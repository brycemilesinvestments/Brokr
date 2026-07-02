export type Form8kConfidence = "high" | "medium" | "low";

export type Form8kClassification = {
  accessionNumber: string;
  declaredItems: string[];
  inferredItems: string[];
  primaryEventType: string;
  itemLabels: Record<string, string>;
  confidence: Form8kConfidence;
  evidence: string[];
};

export type Form8kClassifyInput = {
  accessionNumber: string;
  items?: string | null;
  formType: string;
  documentText: string;
};

export type Form8kClassifyResult = {
  classification: Form8kClassification;
  costUsd: number;
  usedLlm: boolean;
};
