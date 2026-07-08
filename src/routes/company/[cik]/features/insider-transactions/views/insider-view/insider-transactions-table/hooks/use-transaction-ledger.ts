"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import type { LedgerAdFilter } from "../constants";
import {
  availableClassificationGroupFilters,
  matchesClassificationGroup,
  type ClassificationGroupFilter,
} from "../lib/footnote-classification";

function parseTransactionDate(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function matchesAdFilter(
  transaction: InsiderTransaction,
  adFilter: LedgerAdFilter,
): boolean {
  if (adFilter === "all") return true;
  if (adFilter === "acquired") return transaction.acquiredOrDisposed === "A";
  return transaction.acquiredOrDisposed === "D";
}

export function useTransactionLedger(
  transactions: InsiderTransaction[],
  columnFilteredTransactions: InsiderTransaction[],
) {
  const [adFilter, setAdFilter] = useState<LedgerAdFilter>("all");
  const [classificationFilter, setClassificationFilter] =
    useState<ClassificationGroupFilter>("all");

  const classificationFilters = useMemo(
    () => availableClassificationGroupFilters(transactions),
    [transactions],
  );

  useEffect(() => {
    if (
      classificationFilter !== "all" &&
      !classificationFilters.some((filter) => filter.value === classificationFilter)
    ) {
      setClassificationFilter("all");
    }
  }, [classificationFilter, classificationFilters]);

  const filteredTransactions = useMemo(() => {
    return columnFilteredTransactions
      .filter((transaction) => matchesAdFilter(transaction, adFilter))
      .filter((transaction) => matchesClassificationGroup(transaction, classificationFilter))
      .toSorted(
        (a, b) =>
          parseTransactionDate(b.transactionDate) - parseTransactionDate(a.transactionDate) ||
          (b.lineNumber ?? 0) - (a.lineNumber ?? 0),
      );
  }, [columnFilteredTransactions, adFilter, classificationFilter]);

  return {
    adFilter,
    setAdFilter,
    classificationFilter,
    setClassificationFilter,
    classificationFilters,
    filteredTransactions,
  };
}
