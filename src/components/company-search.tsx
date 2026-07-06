"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { navigateToCompanyAnalysis } from "@/routes/company/[cik]/lib/navigate-to-company-analysis";

type CompanySearchProps = {
  autoFocus?: boolean;
  placeholder?: string;
};

export function CompanySearch({
  autoFocus = true,
  placeholder = "Enter ticker or company name (e.g. AAPL, Apple, SNDK)",
}: CompanySearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      if (data.kind === "single") {
        navigateToCompanyAnalysis(data.company.cik, { router });
        return;
      }

      if (data.kind === "multiple") {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        return;
      }

      setError(`No SEC company found for "${trimmed}". Try a ticker symbol.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="company-search" className="sr-only">
          Stock or company name
        </label>
        <input
          id="company-search"
          type="search"
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm outline-none ring-emerald-500/0 transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching…" : "Review filings"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
