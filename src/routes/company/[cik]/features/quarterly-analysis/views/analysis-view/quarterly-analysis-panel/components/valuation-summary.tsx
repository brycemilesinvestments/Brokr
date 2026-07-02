import type { ValuationBundle } from "@/lib/valuation";
import { formatMetricValue } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/utils/format-metric";

type ValuationSummaryProps = {
  valuation: ValuationBundle;
};

export function ValuationSummary({ valuation }: ValuationSummaryProps) {
  const latestEv = valuation.enterpriseValue.points[valuation.enterpriseValue.points.length - 1];
  const latestTtm = valuation.ttmFundamentals[valuation.ttmFundamentals.length - 1];

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {latestEv ? (
        <>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Enterprise value</p>
            <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
              {formatMetricValue("Assets", latestEv.enterpriseValue)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">as of {latestEv.date}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Market cap</p>
            <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
              {formatMetricValue("Assets", latestEv.marketCap)}
            </p>
          </div>
        </>
      ) : null}
      {latestTtm?.revenue !== undefined ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">TTM revenue</p>
          <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
            {formatMetricValue("RevenueFromContractWithCustomerExcludingAssessedTax", latestTtm.revenue)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">period {latestTtm.asOfPeriodEnd}</p>
        </div>
      ) : null}
      {latestTtm?.fcf !== undefined ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">TTM FCF</p>
          <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
            {formatMetricValue("free_cash_flow", latestTtm.fcf)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
