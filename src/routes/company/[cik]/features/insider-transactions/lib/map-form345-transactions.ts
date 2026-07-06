import { filingPagePath, issuerInsiderDispUrl } from "@/lib/edgar/constants";
import type { Form345TransactionRow } from "@/lib/supabase/form345";
import type {
  InsiderTransaction,
  InsiderTransactionsPage,
  ReportingOwner,
} from "@/routes/company/[cik]/features/insider-transactions/types";

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "";
  if (value.includes("/")) return value;

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

function resolveOwnerType(row: Form345TransactionRow): string | undefined {
  if (row.is_officer) return row.officer_title ? `Officer (${row.officer_title})` : "Officer";
  if (row.is_director) return "Director";
  if (row.is_ten_pct_owner) return "10% Owner";
  if (row.is_other) return "Other";
  return undefined;
}

function mapTransaction(row: Form345TransactionRow, cik: string): InsiderTransaction | null {
  const transactionDate = formatDisplayDate(row.transaction_date ?? row.filed_date);
  if (!transactionDate) return null;

  const acquiredOrDisposed =
    row.acquired_or_disposed === "A" || row.acquired_or_disposed === "D"
      ? row.acquired_or_disposed
      : undefined;

  return {
    acquiredOrDisposed,
    transactionDate,
    reportingOwner: row.reporting_owner_name,
    ownerType: resolveOwnerType(row),
    form: row.transaction_code ? "4" : undefined,
    transactionType: row.transaction_code ?? undefined,
    directOrIndirect: row.ownership_form ?? undefined,
    sharesTransacted: row.shares_amount ?? undefined,
    sharesOwnedFollowing: row.shares_owned_following ?? undefined,
    lineNumber: row.line_index,
    ownerCik: row.reporting_owner_cik ?? undefined,
    securityName: row.security_title,
    formUrl: filingPagePath(cik, row.accession_number),
    accessionNumber: row.accession_number,
  };
}

function buildReportingOwners(transactions: InsiderTransaction[]): ReportingOwner[] {
  const owners = new Map<string, ReportingOwner>();

  for (const transaction of transactions) {
    const key = transaction.ownerCik ?? transaction.reportingOwner;
    const existing = owners.get(key);
    if (existing) {
      if (
        transaction.transactionDate &&
        (!existing.latestTransactionDate ||
          Date.parse(transaction.transactionDate) > Date.parse(existing.latestTransactionDate))
      ) {
        existing.latestTransactionDate = transaction.transactionDate;
      }
      continue;
    }

    owners.set(key, {
      ownerName: transaction.reportingOwner,
      ownerCik: transaction.ownerCik,
      latestTransactionDate: transaction.transactionDate,
      ownerType: transaction.ownerType,
      filingsUrl: transaction.ownerCik
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${transaction.ownerCik}&owner=only`
        : undefined,
    });
  }

  return [...owners.values()];
}

export function mapForm345RowsToInsiderPage(
  cik: string,
  rows: Form345TransactionRow[],
): InsiderTransactionsPage {
  const transactions = rows
    .map((row) => mapTransaction(row, cik))
    .filter((transaction): transaction is InsiderTransaction => transaction != null);

  return {
    cik,
    secUrl: issuerInsiderDispUrl(cik),
    reportingOwners: buildReportingOwners(transactions),
    transactions,
    totalShown: transactions.length,
  };
}
