import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { MOVEMENT_COLORS } from "../constants";
import { computeShareBarWidth } from "../lib/compute-share-bar-width";
import { getTransactionTypeStyle } from "../lib/transaction-type-style";
import { LEDGER_GRID_CLASS } from "../constants";
import { formatLedgerDate } from "../utils/format-ledger-date";
import { formatMovement } from "../utils/format-movement";
import { formatShares } from "../utils/format-shares";
import { ownerInitials } from "../utils/owner-initials";

type TransactionLedgerRowProps = {
  transaction: InsiderTransaction;
  maxShareVolume: number;
};

export function TransactionLedgerRow({
  transaction,
  maxShareVolume,
}: TransactionLedgerRowProps) {
  const shares = transaction.sharesTransacted ?? 0;
  const isAcquired = transaction.acquiredOrDisposed === "A";
  const movementColor = isAcquired
    ? MOVEMENT_COLORS.acquired
    : MOVEMENT_COLORS.disposed;
  const typeStyle = getTransactionTypeStyle(transaction.transactionType);
  const barWidth = computeShareBarWidth(shares, maxShareVolume);

  return (
    <div className={`${LEDGER_GRID_CLASS} border-b border-zinc-100 px-[26px] py-3`}>
      <div className="font-mono text-[11.5px] whitespace-nowrap text-zinc-500">
        {formatLedgerDate(transaction.transactionDate)}
      </div>

      <div className="flex min-w-0 items-center gap-[11px]">
        <div className="flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-[9px] border border-zinc-200 bg-zinc-100 text-[11px] font-semibold text-zinc-600">
          {ownerInitials(transaction.reportingOwner)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-zinc-900">
            {transaction.reportingOwner}
          </div>
          {transaction.ownerType ? (
            <div className="truncate text-[11px] text-zinc-400">{transaction.ownerType}</div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${typeStyle.badgeClassName}`}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: typeStyle.dotColor }}
          />
          {typeStyle.badgeLabel}
        </span>
        <div className="mt-1 truncate text-[10.5px] text-zinc-400">{typeStyle.subtitle}</div>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-[13px] font-semibold"
            style={{ color: movementColor }}
          >
            {formatMovement(shares, transaction.acquiredOrDisposed)}
          </span>
          <span className="truncate text-[10.5px] text-zinc-400">
            {transaction.securityName ?? "—"}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-[3px] bg-zinc-100">
          {barWidth > 0 ? (
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${barWidth}%`, backgroundColor: movementColor }}
            />
          ) : null}
        </div>
      </div>

      <div className="text-right font-mono text-[11.5px] whitespace-nowrap text-zinc-600">
        {formatShares(transaction.sharesOwnedFollowing)}
      </div>

      <div className="text-right">
        {transaction.formUrl ? (
          <a
            href={transaction.formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[26px] w-[34px] items-center justify-center rounded-[7px] border border-zinc-200 font-mono text-[10px] font-semibold text-zinc-500 transition hover:bg-zinc-50"
          >
            {transaction.form ?? "4"}
          </a>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </div>
    </div>
  );
}
