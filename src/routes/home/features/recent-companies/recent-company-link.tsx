import Link from "next/link";

export function RecentCompanyLink({
  cik,
  name,
  ticker,
}: {
  cik: string;
  name: string;
  ticker?: string | null;
}) {
  return (
    <Link
      href={`/company/${cik}#analysis`}
      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
    >
      <div className="font-medium text-zinc-900">{name}</div>
      <div className="mt-1 font-mono text-xs text-zinc-500">
        {ticker ? `${ticker} · ` : ""}
        CIK {cik}
      </div>
    </Link>
  );
}
