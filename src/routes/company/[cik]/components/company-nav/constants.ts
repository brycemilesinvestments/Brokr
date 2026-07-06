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

const HASH_TO_TAB: Record<string, CompanyTabValue> = {
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
