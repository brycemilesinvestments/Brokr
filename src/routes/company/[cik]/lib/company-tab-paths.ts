import { formatCik } from "@/lib/edgar/constants";
import type { CompanyNavTab } from "@/routes/company/[cik]/components/company-nav/constants";

export function companyAnalysisPath(cik: string | number): string {
  return `/company/${formatCik(cik)}/analysis`;
}

export function documentsPagePath(cik: string | number, view: "list" | "timeline"): string {
  const base = `/company/${formatCik(cik)}/documents`;
  return view === "timeline" ? `${base}/timeline` : base;
}

export function companyTabPath(
  cik: string | number,
  tab: CompanyNavTab | "timeline" | "list",
  options?: { fredSeriesId?: string | null },
): string {
  const base = `/company/${formatCik(cik)}`;

  switch (tab) {
    case "analysis":
      return `${base}/analysis`;
    case "peers":
      return `${base}/peers`;
    case "shares":
      return `${base}/shares`;
    case "insider":
      return `${base}/insider`;
    case "fred":
      if (options?.fredSeriesId) {
        return `${base}/fred?series=${encodeURIComponent(options.fredSeriesId)}`;
      }
      return `${base}/fred`;
    case "health":
      return `${base}/health`;
    case "patterns":
      return `${base}/patterns`;
    case "guidance":
      return `${base}/guidance`;
    case "trends":
      return `${base}/trends`;
    case "list":
      return documentsPagePath(cik, "list");
    case "timeline":
      return documentsPagePath(cik, "timeline");
    case "documents":
      return documentsPagePath(cik, "timeline");
  }
}

const NAV_TAB_SEGMENTS: Record<string, CompanyNavTab> = {
  analysis: "analysis",
  peers: "peers",
  shares: "shares",
  insider: "insider",
  fred: "fred",
  health: "health",
  patterns: "patterns",
  guidance: "guidance",
  trends: "trends",
  documents: "documents",
};

export function activeTabFromPathname(pathname: string): CompanyNavTab | null {
  const match = pathname.match(/^\/company\/[^/]+\/([^/]+)/);
  if (!match) return null;

  const segment = match[1];
  return NAV_TAB_SEGMENTS[segment] ?? null;
}
