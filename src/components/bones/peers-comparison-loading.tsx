"use client";

import { Skeleton } from "boneyard-js/react";
import { BONE_NAMES } from "@/components/bones/skeleton-names";

function PeersComparisonLoadingContent() {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-5 border-b border-zinc-100 px-6 pb-4 pt-5">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-zinc-100" />
          <div className="h-4 w-56 rounded bg-zinc-100" />
        </div>
        <div className="flex max-w-[246px] flex-wrap justify-end gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-5 w-12 rounded-md bg-zinc-100" />
          ))}
        </div>
      </header>

      <div className="space-y-0 px-6 py-4">
        <div className="mb-3 grid grid-cols-[118px_1fr_116px] gap-x-3.5">
          <div />
          <div className="h-3 rounded bg-zinc-100" />
          <div className="h-3 rounded bg-zinc-100" />
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[118px_1fr_116px] items-center gap-x-3.5 border-t border-zinc-100 py-3"
          >
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-zinc-100" />
              <div className="h-2.5 w-16 rounded bg-zinc-100" />
            </div>
            <div className="h-[18px] rounded-md bg-zinc-100" />
            <div className="h-3.5 w-20 justify-self-end rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

type PeersComparisonLoadingProps = {
  loading?: boolean;
};

export function PeersComparisonLoading({ loading = true }: PeersComparisonLoadingProps) {
  return (
    <Skeleton
      name={BONE_NAMES.peersComparisonPanel}
      loading={loading}
      transition
      animate="shimmer"
      fixture={<PeersComparisonLoadingContent />}
      fallback={<PeersComparisonLoadingContent />}
    >
      <PeersComparisonLoadingContent />
    </Skeleton>
  );
}

export { PeersComparisonLoadingContent };
