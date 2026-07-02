import Link from "next/link";
import { CompanySearch } from "@/components/company-search";
import { RecentCompanyLink } from "@/routes/home";
import { getRecentCompanies } from "@/lib/supabase/companies";

export default async function Home() {
  const recentCompanies = await getRecentCompanies();

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <main className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-20">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Edgar Review
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Review a stock&apos;s SEC filings in seconds
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
            Enter a ticker or company name to open quarterly analysis, parsed filings,
            and your financial modeling review workflow.
          </p>
        </div>

        <CompanySearch />

        <p className="mt-6 text-sm text-zinc-600">
          <Link href="/watchlist" className="font-medium text-emerald-700 hover:underline">
            Open watchlist
          </Link>
          {" "}to monitor filings, thresholds, and insider purchases.
        </p>

        {recentCompanies.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Recently viewed
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {recentCompanies.map((company) => (
                <RecentCompanyLink
                  key={company.id}
                  cik={company.edgar_id}
                  name={company.name}
                  ticker={company.ticker}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Ticker lookup",
              body: "Resolve symbols via SEC company tickers, then open the company filings page.",
            },
            {
              title: "Quarterly analysis",
              body: "Ratios, deltas, and anomalies from the latest 10-Q and 10-K, ready for review.",
            },
            {
              title: "Supabase ready",
              body: "Optional company history storage when you connect your Supabase project.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 backdrop-blur"
            >
              <h3 className="font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
