"use client";

import { cn } from "@/lib/utils";

type FilingsTablePaginationView = {
  showMoreTotal?: boolean;
  hasResults?: boolean;
};

type FilingsTablePaginationNavigation = {
  canGoPrevious: boolean;
  canGoNext: boolean;
  hasMoreFilings: boolean;
  isLoadingMore: boolean;
};

const EMPTY_PAGINATION_VIEW: FilingsTablePaginationView = {};

type FilingsTablePaginationProps = {
  pageIndex: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalCount: number;
  view?: FilingsTablePaginationView;
  navigation: FilingsTablePaginationNavigation;
  loadError: string | null;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLoadRemainingFilings?: () => void;
};

export function FilingsTablePagination({
  pageIndex,
  totalPages,
  pageStart,
  pageEnd,
  totalCount,
  view = EMPTY_PAGINATION_VIEW,
  navigation,
  loadError,
  onPreviousPage,
  onNextPage,
  onLoadRemainingFilings,
}: FilingsTablePaginationProps) {
  const { showMoreTotal = false, hasResults = true } = view;
  const { canGoPrevious, canGoNext, hasMoreFilings, isLoadingMore } = navigation;

  if (!hasResults) return null;

  const showLoadRemaining =
    hasMoreFilings && pageIndex === totalPages - 1 && !canGoNext && !isLoadingMore;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-6 py-3 pr-24">
      <p className="text-sm text-zinc-500">
        {totalCount === 0
          ? "No filings to display"
          : `Showing ${pageStart}–${pageEnd} of ${totalCount}${showMoreTotal ? "+" : ""}`}
        {isLoadingMore ? " · Loading remaining filings…" : null}
      </p>

      <div className="flex items-center gap-2">
        {loadError && onLoadRemainingFilings ? (
          <button
            type="button"
            onClick={onLoadRemainingFilings}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Retry load
          </button>
        ) : null}

        {showLoadRemaining && onLoadRemainingFilings ? (
          <button
            type="button"
            onClick={onLoadRemainingFilings}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Load all filings
          </button>
        ) : null}

        <button
          type="button"
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
          className={paginationButtonClass(!canGoPrevious)}
        >
          Previous
        </button>

        <span className="min-w-[88px] text-center text-sm text-zinc-600">
          Page {pageIndex + 1} of {hasMoreFilings && pageIndex === totalPages - 1 ? `${totalPages}+` : totalPages}
        </span>

        <button
          type="button"
          onClick={showLoadRemaining && onLoadRemainingFilings ? onLoadRemainingFilings : onNextPage}
          disabled={!canGoNext && !showLoadRemaining}
          className={paginationButtonClass(!canGoNext && !showLoadRemaining)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function paginationButtonClass(disabled: boolean) {
  return cn(
    "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50",
    disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
  );
}
