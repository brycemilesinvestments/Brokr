import { formatCik } from "@/lib/edgar/constants";
import { listForm345TransactionsByIssuerCik } from "@/lib/supabase/form345";
import { mapForm345RowsToInsiderPage } from "@/routes/company/[cik]/features/insider-transactions/lib/map-form345-transactions";
import type { InsiderTransactionsPage } from "@/routes/company/[cik]/features/insider-transactions/types";

export async function fetchStoredInsiderTransactions(
  cikInput: string | number,
): Promise<InsiderTransactionsPage> {
  const cik = formatCik(cikInput);
  const rows = await listForm345TransactionsByIssuerCik(cik);
  return mapForm345RowsToInsiderPage(cik, rows);
}
