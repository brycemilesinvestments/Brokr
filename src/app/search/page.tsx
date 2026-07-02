import Link from "next/link";
import { redirect } from "next/navigation";
import { CompanySearch } from "@/components/company-search";
import { formatCik } from "@/lib/edgar/constants";
import { resolveCompany } from "@/lib/edgar/resolve-company";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchResultsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <CompanySearch />
      </div>
    );
  }

  const result = await resolveCompany(query);

  if (result.kind === "single") {
    redirect(`/company/${formatCik(result.company.cik)}#analysis`);
  }

  if (result.kind === "none") {
    return (
      <div className="min-h-full bg-zinc-50">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            ← Back
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-zinc-900">No matches</h1>
          <p className="mt-2 text-zinc-600">
            No SEC company found for &ldquo;{query}&rdquo;. Try a ticker symbol.
          </p>
          <div className="mt-8">
            <CompanySearch autoFocus />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm font-semibold text-emerald-700">
          ← Back
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-zinc-900">Choose a company</h1>
        <p className="mt-2 text-zinc-600">
          Multiple SEC registrants match &ldquo;{query}&rdquo;. Choose the entity you want to review.
        </p>

        <ul className="mt-8 space-y-3">
          {result.matches.map((match) => (
            <li key={match.cik}>
              <Link
                href={`/company/${formatCik(match.cik)}#analysis`}
                className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div className="font-medium text-zinc-900">{match.title}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-500">
                  {match.ticker ? (
                    <span className="font-mono">{match.ticker}</span>
                  ) : null}
                  <span className="font-mono">CIK {formatCik(match.cik)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
