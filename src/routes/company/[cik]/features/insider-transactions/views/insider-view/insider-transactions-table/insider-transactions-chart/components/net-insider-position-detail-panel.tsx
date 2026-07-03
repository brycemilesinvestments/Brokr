import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { NET_POSITION_COLORS } from "../constants";
import type { NetPositionBarGeometry } from "../types";
import { formatNetShares } from "../utils/format-net-shares";
import { formatShares } from "../utils/format-shares";

type NetInsiderPositionDetailPanelProps = {
  bar: NetPositionBarGeometry;
  onClose: () => void;
};

function formatTransactionDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NetInsiderPositionDetailPanel({
  bar,
  onClose,
}: NetInsiderPositionDetailPanelProps) {
  const color =
    bar.direction === "acquired"
      ? NET_POSITION_COLORS.acquired
      : NET_POSITION_COLORS.disposed;

  return (
    <aside className="flex h-full min-h-0 w-[min(520px,52%)] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50/60">
      <div className="shrink-0 flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900">{bar.owner}</h4>
          {bar.ownerType ? (
            <p className="mt-0.5 text-xs text-zinc-500">{bar.ownerType}</p>
          ) : null}
          <p className="mt-1 font-mono text-xs font-semibold" style={{ color }}>
            Net {formatNetShares(bar.netShares)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-800"
        >
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-zinc-50 text-left font-semibold tracking-wide text-zinc-500 uppercase">
            <tr className="border-b border-zinc-200">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Stock</th>
              <th className="px-2 py-2 font-medium">A/D</th>
              <th className="px-2 py-2 text-right font-medium">Owned after</th>
              <th className="px-2 py-2 text-right font-medium">Movement</th>
              <th className="px-4 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {bar.transactions.map((transaction) => (
              <TransactionRow
                key={`${transaction.accessionNumber ?? "na"}-${transaction.lineNumber ?? 0}-${transaction.transactionDate}`}
                transaction={transaction}
              />
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function TransactionRow({ transaction }: { transaction: InsiderTransaction }) {
  const shares = transaction.sharesTransacted ?? 0;
  const isAcquired = transaction.acquiredOrDisposed === "A";
  const rowColor = isAcquired ? NET_POSITION_COLORS.acquired : NET_POSITION_COLORS.disposed;

  return (
    <tr className="text-zinc-700">
      <td className="px-4 py-2 whitespace-nowrap text-zinc-600">
        {formatTransactionDate(transaction.transactionDate)}
      </td>
      <td className="max-w-[7rem] truncate px-2 py-2 text-zinc-700" title={transaction.securityName}>
        {transaction.securityName ?? "—"}
      </td>
      <td className="px-2 py-2 font-mono">{transaction.acquiredOrDisposed ?? "—"}</td>
      <td className="px-2 py-2 text-right font-mono">
        {transaction.sharesOwnedFollowing !== undefined
          ? formatShares(transaction.sharesOwnedFollowing)
          : "—"}
      </td>
      <td className="px-2 py-2 text-right font-mono font-semibold" style={{ color: rowColor }}>
        {isAcquired ? "+" : "−"}
        {formatShares(shares)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        {transaction.formUrl ? (
          <a
            href={transaction.formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-700 hover:text-emerald-800"
          >
            See details
          </a>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}
