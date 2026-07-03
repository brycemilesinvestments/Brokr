import { describe, expect, it, vi } from "vitest";
import { fetchComparePeersFromYahoo } from "@/lib/peers/yahoo-adapters";
import sndkRecommendations from "../../fixtures/sndk-yahoo-recommendations.json";

describe("Yahoo compare peers adapter", () => {
  it("parses recommendationsbysymbol response", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sndkRecommendations), { status: 200 }),
    );

    vi.stubGlobal("fetch", fetchFn);

    const peers = await fetchComparePeersFromYahoo("SNDK");

    expect(peers).toEqual([
      { ticker: "WDC", score: 0.149428 },
      { ticker: "STX", score: 0.12872 },
      { ticker: "MRVL", score: 0.124361 },
      { ticker: "MU", score: 0.123974 },
      { ticker: "NBIS", score: 0.113993 },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://query2.finance.yahoo.com/v6/finance/recommendationsbysymbol/SNDK",
      expect.objectContaining({ headers: expect.any(Object) }),
    );

    vi.unstubAllGlobals();
  });

  it("returns empty array on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("error", { status: 500 })),
    );

    await expect(fetchComparePeersFromYahoo("SNDK")).resolves.toEqual([]);

    vi.unstubAllGlobals();
  });
});
