"use client";

import Link from "next/link";
import type { CompanyNavTab } from "@/routes/company/[cik]/components/company-nav/constants";
import { companyTabPath } from "@/routes/company/[cik]/lib/company-tab-paths";
import { CompanySidebarSearch } from "@/routes/company/[cik]/components/company-sidebar-search/company-sidebar-search";
import { companyInitials } from "@/routes/company/[cik]/features/company-info/utils/format-company-header";
import { cn } from "@/lib/utils";
import {
  CompanySidebarAiBadge,
  CompanySidebarNavItem,
  CompanySidebarSectionLabel,
} from "./company-sidebar-nav-item";
import {
  NavIconChevronRight,
  NavIconClose,
  NavIconDocuments,
  NavIconFred,
  NavIconGrid,
  NavIconGuidance,
  NavIconHealth,
  NavIconInsider,
  NavIconPatterns,
  NavIconPeers,
  NavIconShares,
  NavIconTrends,
} from "./company-sidebar-icons";

type CompanySidebarProps = {
  cik: string;
  companyName: string;
  ticker?: string;
  activeTab: CompanyNavTab;
  showInsider: boolean;
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
};

export function CompanySidebar({
  cik,
  companyName,
  ticker,
  activeTab,
  showInsider,
  open = false,
  onClose,
  onNavigate,
}: CompanySidebarProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      ) : null}

      <nav
        className={cn(
          "flex w-[238px] shrink-0 flex-col border-r border-zinc-200 bg-white",
          "transition-transform duration-200 ease-in-out",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:h-dvh",
          "lg:static lg:z-auto lg:h-full",
          open ? "max-lg:translate-x-0 lg:flex" : "max-lg:-translate-x-full lg:hidden",
        )}
      >
      <div className="flex items-center gap-2 border-b border-zinc-100">
        <button
          type="button"
          onClick={onClose}
          className="ml-3.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
          aria-label="Close navigation"
        >
          <NavIconClose />
        </button>
        <span className="truncate text-[13px] font-semibold text-zinc-900">Navigation</span>
      </div>

      <Link
        href="/"
        className="flex items-center gap-2.5 border-b border-zinc-100 px-3.5 py-3.5 transition-colors hover:bg-zinc-50"
      >
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-xs font-bold text-white">
          {companyInitials(companyName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight text-zinc-900">
            {companyName}
          </div>
          {ticker ? (
            <div className="mt-px truncate font-mono text-[9.5px] font-semibold text-zinc-400">
              {ticker}
            </div>
          ) : null}
        </div>
        <NavIconChevronRight className="shrink-0 text-zinc-400" />
      </Link>

      <CompanySidebarSearch currentCik={cik} />

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-0.5">
        <CompanySidebarNavItem
          label="Analysis"
          icon={<NavIconGrid />}
          active={activeTab === "analysis"}
          href={companyTabPath(cik, "analysis")}
          onNavigate={onNavigate}
        />

        <CompanySidebarSectionLabel>Market</CompanySidebarSectionLabel>
        <CompanySidebarNavItem
          label="Peers"
          icon={<NavIconPeers />}
          active={activeTab === "peers"}
          href={companyTabPath(cik, "peers")}
          onNavigate={onNavigate}
        />
        <CompanySidebarNavItem
          label="Outstanding shares"
          icon={<NavIconShares />}
          active={activeTab === "shares"}
          href={companyTabPath(cik, "shares")}
          onNavigate={onNavigate}
        />
        {showInsider ? (
          <CompanySidebarNavItem
            label="Insider transactions"
            icon={<NavIconInsider />}
            active={activeTab === "insider"}
            href={companyTabPath(cik, "insider")}
            onNavigate={onNavigate}
          />
        ) : null}
        <CompanySidebarNavItem
          label="FRED analytics"
          icon={<NavIconFred />}
          active={activeTab === "fred"}
          href={companyTabPath(cik, "fred")}
          onNavigate={onNavigate}
        />

        <CompanySidebarSectionLabel badge={<CompanySidebarAiBadge />}>AI analysis</CompanySidebarSectionLabel>
        <CompanySidebarNavItem
          label="Health"
          icon={<NavIconHealth />}
          active={activeTab === "health"}
          href={companyTabPath(cik, "health")}
          onNavigate={onNavigate}
        />
        <CompanySidebarNavItem
          label="Patterns"
          icon={<NavIconPatterns />}
          active={activeTab === "patterns"}
          href={companyTabPath(cik, "patterns")}
          onNavigate={onNavigate}
        />
        <CompanySidebarNavItem
          label="Guidance"
          icon={<NavIconGuidance />}
          active={activeTab === "guidance"}
          href={companyTabPath(cik, "guidance")}
          onNavigate={onNavigate}
        />
        <CompanySidebarNavItem
          label="SEC trends"
          icon={<NavIconTrends />}
          active={activeTab === "trends"}
          href={companyTabPath(cik, "trends")}
          onNavigate={onNavigate}
        />
        <p className="px-2.5 pt-0.5 text-[9.5px] leading-snug text-zinc-300">
          Model-generated · review before use
        </p>

        <CompanySidebarSectionLabel>Filings</CompanySidebarSectionLabel>
        <CompanySidebarNavItem
          label="Documents"
          description="List & timeline"
          icon={<NavIconDocuments />}
          active={activeTab === "documents"}
          href={companyTabPath(cik, "documents")}
          onNavigate={onNavigate}
        />
      </div>
      </nav>
    </>
  );
}
