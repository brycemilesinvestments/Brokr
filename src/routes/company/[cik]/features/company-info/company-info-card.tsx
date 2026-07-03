import type { ReactNode } from "react";
import type { StockSnapshot } from "@/routes/company/[cik]/lib/compute-stock-snapshot";
import type { CompanyInfo } from "@/routes/company/[cik]/types";
import {
  companyInitials,
  formatCompanyLocation,
  formatDisplayCik,
  formatFiscalYearEnd,
  formatHeaderChange,
  formatHeaderPrice,
} from "./utils/format-company-header";

type CompanyInfoCardProps = {
  info: CompanyInfo;
  ticker?: string;
  stock?: StockSnapshot | null;
};

type HeaderStatProps = {
  label: string;
  children: ReactNode;
  variant?: "price" | "text";
  valueClassName?: string;
};

function HeaderStat({ label, children, variant = "text", valueClassName }: HeaderStatProps) {
  const valueClasses =
    variant === "price"
      ? "font-mono text-[15px] font-bold text-zinc-900"
      : "text-[12.5px] font-medium text-zinc-800";

  return (
    <div className="shrink-0">
      <div className="text-[8.5px] uppercase tracking-[0.06em] text-zinc-400">{label}</div>
      <div className={["mt-0.5 whitespace-nowrap", valueClasses, valueClassName].join(" ")}>
        {children}
      </div>
    </div>
  );
}

export function CompanyInfoCard({ info, ticker, stock }: CompanyInfoCardProps) {
  const location = formatCompanyLocation(info);
  const fiscalYearEnd = formatFiscalYearEnd(info.fiscalYearEnd);
  const changeIsPositive = (stock?.changePercent ?? 0) >= 0;

  return (
    <section className="w-full border-b border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-4 px-5 py-3.5 lg:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-emerald-100 bg-emerald-50 font-mono text-[13px] font-bold text-emerald-700">
            {companyInitials(info.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-[-0.01em] text-zinc-900">
                {info.name}
              </h1>
              {ticker ? (
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-zinc-600">
                  {ticker}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
              CIK {formatDisplayCik(info.cik)}
              {info.sic ? ` · SIC ${info.sic}` : ""}
            </p>
          </div>
        </div>

        <div className="hidden h-[34px] w-px shrink-0 bg-zinc-100 sm:block" aria-hidden />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5 overflow-hidden">
          {stock ? (
            <>
              <HeaderStat label="Last" variant="price">
                ${formatHeaderPrice(stock.lastPrice)}
              </HeaderStat>
              <HeaderStat
                label="Change"
                variant="price"
                valueClassName={changeIsPositive ? "text-emerald-700" : "text-red-600"}
              >
                {formatHeaderChange(stock.changePercent)}
              </HeaderStat>
            </>
          ) : null}
          {location ? <HeaderStat label="Location">{location}</HeaderStat> : null}
          {fiscalYearEnd ? <HeaderStat label="FY end">{fiscalYearEnd}</HeaderStat> : null}
        </div>
      </div>
    </section>
  );
}
