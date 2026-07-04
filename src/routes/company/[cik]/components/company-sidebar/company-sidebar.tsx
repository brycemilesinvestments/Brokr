"use client";

import Link from "next/link";
import type { CompanyNavTab } from "@/routes/company/[cik]/components/company-nav/constants";
import { CompanySidebarSearch } from "@/routes/company/[cik]/components/company-sidebar-search/company-sidebar-search";
import { companyInitials } from "@/routes/company/[cik]/features/company-info/utils/format-company-header";
import {
  CompanySidebarAiBadge,
  CompanySidebarNavItem,
  CompanySidebarSectionLabel,
} from "./company-sidebar-nav-item";
import {
  NavIconChevronRight,
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
  companyName: string;
  ticker?: string;
  activeTab: CompanyNavTab;
  showInsider: boolean;
  onNavigate: (tab: CompanyNavTab) => void;
};

export function CompanySidebar({
  companyName,
  ticker,
  activeTab,
  showInsider,
  onNavigate,
}: CompanySidebarProps) {
  return (
    <nav className="flex w-[238px] shrink-0 flex-col border-r border-zinc-200 bg-white">
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

      <CompanySidebarSearch />

      <div className="flex-1 overflow-y-auto px-2.5 pb-3 pt-0.5">
        <CompanySidebarNavItem
          label="Analysis"
          icon={<NavIconGrid />}
          active={activeTab === "analysis"}
          onClick={() => onNavigate("analysis")}
        />

        <CompanySidebarSectionLabel>Market</CompanySidebarSectionLabel>
        <CompanySidebarNavItem
          label="Peers"
          icon={<NavIconPeers />}
          active={activeTab === "peers"}
          onClick={() => onNavigate("peers")}
        />
        <CompanySidebarNavItem
          label="Outstanding shares"
          icon={<NavIconShares />}
          active={activeTab === "shares"}
          onClick={() => onNavigate("shares")}
        />
        {showInsider ? (
          <CompanySidebarNavItem
            label="Insider transactions"
            icon={<NavIconInsider />}
            active={activeTab === "insider"}
            onClick={() => onNavigate("insider")}
          />
        ) : null}
        <CompanySidebarNavItem
          label="FRED analytics"
          icon={<NavIconFred />}
          active={activeTab === "fred"}
          onClick={() => onNavigate("fred")}
        />

        <CompanySidebarSectionLabel badge={<CompanySidebarAiBadge />}>AI analysis</CompanySidebarSectionLabel>
        <CompanySidebarNavItem
          label="Health"
          icon={<NavIconHealth />}
          active={activeTab === "health"}
          onClick={() => onNavigate("health")}
        />
        <CompanySidebarNavItem
          label="Patterns"
          icon={<NavIconPatterns />}
          active={activeTab === "patterns"}
          onClick={() => onNavigate("patterns")}
        />
        <CompanySidebarNavItem
          label="Guidance"
          icon={<NavIconGuidance />}
          active={activeTab === "guidance"}
          onClick={() => onNavigate("guidance")}
        />
        <CompanySidebarNavItem
          label="SEC trends"
          icon={<NavIconTrends />}
          active={activeTab === "trends"}
          onClick={() => onNavigate("trends")}
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
          onClick={() => onNavigate("documents")}
        />
      </div>
    </nav>
  );
}
