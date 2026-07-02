import Link from "next/link";
import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";
import { formatSharesFull, formatTableDate } from "../utils/format-shares";

type SharesDataTableProps = {
  points: OutstandingSharePoint[];
};

export function SharesDataTable({ points }: SharesDataTableProps) {
  return (
    <div className="border-t border-zinc-100">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-6 py-3 font-medium">As of</th>
              <th className="px-6 py-3 font-medium text-right">Shares</th>
              <th className="px-6 py-3 font-medium">Form</th>
              <th className="px-6 py-3 font-medium">Filed</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Filing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {[...points].reverse().map((point) => (
              <tr key={`${point.accessionNumber}-${point.asOfDate}`} className="hover:bg-zinc-50/80">
                <td className="px-6 py-3 whitespace-nowrap text-zinc-700">
                  {formatTableDate(point.asOfDate)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-zinc-900">
                  {formatSharesFull(point.shares)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-zinc-700">{point.form}</td>
                <td className="px-6 py-3 whitespace-nowrap text-zinc-600">
                  {formatTableDate(point.filedDate)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-zinc-600">
                  {point.source === "cover-page" ? "Cover page" : "Balance sheet"}
                </td>
                <td className="px-6 py-3">
                  <Link
                    href={point.filingUrl}
                    className="font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
