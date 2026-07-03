"use client";

import { Skeleton } from "boneyard-js/react";
import { BONE_NAMES } from "./skeleton-names";

type CompanyAnalysisLoadingProps = {
  loading?: boolean;
};

export function CompanyAnalysisLoadingContent() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">Company analysis</h2>
        <p className="mt-1 text-sm text-zinc-500">Loading full Chunk 10 analysis…</p>
      </div>
      <div className="space-y-4 px-6 py-8">
        <div className="h-4 w-48 rounded bg-zinc-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CompanyAnalysisLoading({ loading = true }: CompanyAnalysisLoadingProps) {
  return (
    <Skeleton
      name={BONE_NAMES.companyAnalysisPanel}
      loading={loading}
      transition
      animate="shimmer"
      fixture={<CompanyAnalysisLoadingContent />}
      fallback={<CompanyAnalysisLoadingContent />}
    >
      <CompanyAnalysisLoadingContent />
    </Skeleton>
  );
}
