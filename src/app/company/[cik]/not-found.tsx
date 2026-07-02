import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Company not found</h1>
        <p className="mt-3 text-zinc-600">
          We couldn&apos;t load SEC filings for that CIK. Try searching again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to search
        </Link>
      </div>
    </div>
  );
}
