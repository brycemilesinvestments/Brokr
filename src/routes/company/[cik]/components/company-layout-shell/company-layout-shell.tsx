"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AskFilingsOverlay } from "@/routes/company/[cik]/features/rag-chat";
import {
  parseLocationHash,
  type CompanyNavTab,
  type CompanyTabValue,
} from "@/routes/company/[cik]/components/company-nav/constants";
import {
  activeTabFromPathname,
  companyTabPath,
  documentsPagePath,
} from "@/routes/company/[cik]/lib/company-tab-paths";
import {
  CompanySidebar,
  CompanySidebarMenuButton,
} from "@/routes/company/[cik]/components/company-sidebar";
import type { Filing } from "@/routes/company/[cik]/types";

type CompanyLayoutShellProps = {
  cik: string;
  companyName: string;
  ticker?: string;
  filings: Filing[];
  showInsider: boolean;
  children: ReactNode;
};

type CompanyLayoutShellContextValue = {
  cik: string;
  companyName: string;
  ticker?: string;
  filings: Filing[];
  showInsider: boolean;
  companySidebarOpen: boolean;
  setCompanySidebarOpen: (open: boolean) => void;
  sidebarMenuButton: ReactNode;
  closeMobileSidebar: () => void;
};

const CompanyLayoutShellContext = createContext<CompanyLayoutShellContextValue | null>(null);

function resolveLegacyHashPath(
  cik: string,
  showInsider: boolean,
  tab: CompanyTabValue,
  fredSeriesId?: string | null,
): string | null {
  if (tab === "chat") return null;
  if (tab === "insider" && !showInsider) {
    return companyTabPath(cik, "analysis");
  }
  if (tab === "documents" || tab === "timeline") {
    return documentsPagePath(cik, tab === "documents" ? "list" : "timeline");
  }
  return companyTabPath(cik, tab as CompanyNavTab, { fredSeriesId });
}

export function useCompanyLayoutShell(): CompanyLayoutShellContextValue {
  const context = use(CompanyLayoutShellContext);
  if (!context) {
    throw new Error("useCompanyLayoutShell must be used within CompanyLayoutShell");
  }
  return context;
}

export function CompanyLayoutShell({
  cik,
  companyName,
  ticker,
  filings,
  showInsider,
  children,
}: CompanyLayoutShellProps) {
  const pathname = usePathname();
  const [companySidebarOpen, setCompanySidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const activeTab: CompanyNavTab = activeTabFromPathname(pathname) ?? "analysis";

  useLayoutEffect(() => {
    setCompanySidebarOpen(window.matchMedia("(min-width: 1024px)").matches);
    setChatOpen(parseLocationHash(window.location.hash).tab === "chat");
  }, []);

  useLayoutEffect(() => {
    const { tab, fredSeriesId } = parseLocationHash(window.location.hash);
    if (!tab) return;

    const legacyPath = resolveLegacyHashPath(cik, showInsider, tab, fredSeriesId);
    if (legacyPath) {
      window.location.replace(legacyPath);
      return;
    }

    if (tab === "chat") {
      window.history.replaceState(null, "", pathname);
    }
  }, [cik, pathname, showInsider]);

  const closeMobileSidebar = useCallback(() => {
    setCompanySidebarOpen(false);
  }, []);

  const sidebarMenuButton = useMemo(
    () =>
      !companySidebarOpen ? (
        <CompanySidebarMenuButton onClick={() => setCompanySidebarOpen(true)} />
      ) : null,
    [companySidebarOpen],
  );

  const contextValue = useMemo(
    () => ({
      cik,
      companyName,
      ticker,
      filings,
      showInsider,
      companySidebarOpen,
      setCompanySidebarOpen,
      sidebarMenuButton,
      closeMobileSidebar,
    }),
    [
      cik,
      companyName,
      ticker,
      filings,
      showInsider,
      companySidebarOpen,
      sidebarMenuButton,
      closeMobileSidebar,
    ],
  );

  return (
    <CompanyLayoutShellContext value={contextValue}>
      <div className="flex h-dvh overflow-hidden bg-zinc-50">
        <CompanySidebar
          cik={cik}
          companyName={companyName}
          ticker={ticker}
          activeTab={activeTab}
          showInsider={showInsider}
          open={companySidebarOpen}
          onClose={() => setCompanySidebarOpen(false)}
          onNavigate={closeMobileSidebar}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>

        <AskFilingsOverlay
          cik={cik}
          companyName={companyName}
          ticker={ticker}
          filings={filings}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      </div>
    </CompanyLayoutShellContext>
  );
}
