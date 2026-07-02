"use client";

import { useMemo, useState } from "react";
import type { FilingDocument } from "@/routes/company/[cik]/filing/[accession]/types";
import type { FilingXbrlExtraction } from "@/lib/edgar/xbrl/types";
import { isXbrlFactDocument } from "@/lib/edgar/xbrl/document-kind";
import { filterFinancialStatements } from "@/lib/edgar/xbrl/filter-financial-facts";
import { groupStatementRows } from "../lib/group-statement-rows";
import type { ViewMode } from "../types";
import { formatPeriod } from "../utils/format-period";

type UseFilingXbrlOptions = {
  cik: string;
  accessionNumber: string;
  documents: FilingDocument[];
  initialExtraction?: FilingXbrlExtraction;
};

export function useFilingXbrl({
  cik,
  accessionNumber,
  documents,
  initialExtraction,
}: UseFilingXbrlOptions) {
  const xbrlDocuments = useMemo(() => documents.filter(isXbrlFactDocument), [documents]);
  const [selectedDocument, setSelectedDocument] = useState(
    initialExtraction?.documents[0]?.documentName ?? xbrlDocuments[0]?.documentName ?? "",
  );
  const [extraction, setExtraction] = useState<FilingXbrlExtraction | null>(
    initialExtraction ?? null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("statements");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDocument = extraction?.documents.find(
    (doc) => doc.documentName === selectedDocument,
  );

  const statementRows = useMemo(
    () => (activeDocument ? filterFinancialStatements(activeDocument.facts) : []),
    [activeDocument],
  );

  const statementGroups = useMemo(() => groupStatementRows(statementRows), [statementRows]);

  const filteredRawFacts = useMemo(() => {
    if (!activeDocument) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return activeDocument.facts;

    return activeDocument.facts.filter((fact) => {
      const haystack = [
        fact.name,
        fact.concept,
        fact.taxonomy,
        fact.value,
        formatPeriod(fact),
        fact.unit ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [activeDocument, query]);

  async function loadExtraction(documentName?: string) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (documentName) params.set("document", documentName);
      const suffix = params.size ? `?${params.toString()}` : "";
      const response = await fetch(
        `/api/company/${cik}/filing/${encodeURIComponent(accessionNumber)}/xbrl${suffix}`,
      );

      if (!response.ok) {
        throw new Error("Failed to extract XBRL from this filing.");
      }

      const data = (await response.json()) as FilingXbrlExtraction;
      setExtraction(data);
      if (documentName) setSelectedDocument(documentName);
      else if (data.documents[0]) setSelectedDocument(data.documents[0].documentName);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "XBRL extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  return {
    xbrlDocuments,
    selectedDocument,
    setSelectedDocument,
    extraction,
    viewMode,
    setViewMode,
    query,
    setQuery,
    loading,
    error,
    activeDocument,
    statementRows,
    statementGroups,
    filteredRawFacts,
    loadExtraction,
  };
}
