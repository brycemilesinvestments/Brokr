"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { navigateToCompanyAnalysis } from "@/routes/company/[cik]/lib/navigate-to-company-analysis";

type CompanySidebarSearchProps = {
  currentCik: string;
  className?: string;
};

export function CompanySidebarSearch({ currentCik, className }: CompanySidebarSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || submittingRef.current) return;

    submittingRef.current = true;
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) return;

      if (data.kind === "single") {
        setQuery("");
        navigateToCompanyAnalysis(data.company.cik, { router, currentCik });
        return;
      }

      if (data.kind === "multiple") {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("px-3 pb-2 pt-3", className)}>
      <label htmlFor="company-sidebar-search" className="sr-only">
        Search company
      </label>
      <div className="flex h-8 items-center gap-1.5 rounded-[9px] border border-zinc-200 bg-zinc-50 px-2.5">
        <SearchIcon className="shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          id="company-sidebar-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company…"
          className="min-w-0 flex-1 bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <kbd className="shrink-0 rounded border border-zinc-200 px-1 py-px font-mono text-[9px] font-semibold text-zinc-300">
          ⌘K
        </kbd>
      </div>
    </form>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <circle cx="6" cy="6" r="4.2" />
      <line x1="9.3" y1="9.3" x2="12" y2="12" />
    </svg>
  );
}
