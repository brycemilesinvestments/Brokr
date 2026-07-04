import type { ReactNode } from "react";
import { NavIconBreadcrumbChevron } from "@/routes/company/[cik]/components/company-sidebar/company-sidebar-icons";

type CompanyContentHeaderProps = {
  ticker?: string;
  title: string;
  actions?: ReactNode;
};

export function CompanyContentHeader({ ticker, title, actions }: CompanyContentHeaderProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-zinc-200 bg-white px-5">
      {ticker ? (
        <span className="font-mono text-[11px] font-semibold text-zinc-400">{ticker}</span>
      ) : null}
      {ticker ? <NavIconBreadcrumbChevron className="text-zinc-300" /> : null}
      <span className="text-[13px] font-semibold text-zinc-900">{title}</span>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
