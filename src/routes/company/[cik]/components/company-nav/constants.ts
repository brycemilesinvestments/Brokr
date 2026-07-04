export type CompanyNavTab =
  | "analysis"
  | "peers"
  | "shares"
  | "insider"
  | "fred"
  | "health"
  | "patterns"
  | "guidance"
  | "trends"
  | "documents";

export type CompanyTabValue = CompanyNavTab | "chat" | "timeline";

export const TAB_TITLES: Record<CompanyTabValue, string> = {
  analysis: "Analysis",
  chat: "Ask filings",
  peers: "Peers",
  shares: "Outstanding shares",
  insider: "Insider transactions",
  fred: "FRED macro analytics",
  health: "Health",
  patterns: "Patterns",
  guidance: "Guidance",
  trends: "SEC trends",
  documents: "Documents",
  timeline: "Document timeline",
};

export const HASH_TO_TAB: Record<string, CompanyTabValue> = {
  "#analysis": "analysis",
  "#chat": "chat",
  "#ask": "chat",
  "#peers": "peers",
  "#health": "health",
  "#patterns": "patterns",
  "#guidance": "guidance",
  "#financial-trends": "trends",
  "#trends": "trends",
  "#outstanding-shares": "shares",
  "#shares": "shares",
  "#insider-transactions": "insider",
  "#insider": "insider",
  "#documents": "documents",
  "#timeline": "timeline",
  "#fred": "fred",
};

export function tabToHash(tab: CompanyTabValue, fredSeriesId?: string | null): string {
  switch (tab) {
    case "analysis":
      return "#analysis";
    case "chat":
      return "#chat";
    case "peers":
      return "#peers";
    case "health":
      return "#health";
    case "patterns":
      return "#patterns";
    case "guidance":
      return "#guidance";
    case "trends":
      return "#financial-trends";
    case "insider":
      return "#insider-transactions";
    case "documents":
      return "#documents";
    case "timeline":
      return "#timeline";
    case "fred":
      return fredSeriesId ? `#fred/${encodeURIComponent(fredSeriesId)}` : "#fred";
    case "shares":
      return "#outstanding-shares";
  }
}

export function parseLocationHash(hash: string): {
  tab: CompanyTabValue | null;
  fredSeriesId: string | null;
} {
  if (hash === "#fred" || hash.startsWith("#fred/")) {
    const fredSeriesId =
      hash.length > "#fred/".length ? decodeURIComponent(hash.slice("#fred/".length)) : null;
    return { tab: "fred", fredSeriesId };
  }

  return { tab: HASH_TO_TAB[hash] ?? null, fredSeriesId: null };
}

export function sidebarTabForValue(tab: CompanyTabValue): CompanyNavTab | null {
  if (tab === "timeline") return "documents";
  if (tab === "chat") return null;
  return tab;
}
