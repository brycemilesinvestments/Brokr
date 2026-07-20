// @ts-check

import { createIndependentModules } from "eslint-plugin-project-structure";

const routeSharedImports = [
  "src/routes/types.ts",
  "src/routes/lib/**",
  "src/components/**",
  "src/lib/**",
];

/**
 * 9-chunk architecture: edgar, market, ai, analysis, agent, orchestrate,
 * metrics, valuation, insider.
 * Each chunk (except Edgar) can import from edgar, market, and upstream chunks.
 * Routes and App layer import from chunks via barrels only.
 */
export const independentModulesConfig = createIndependentModules({
  modules: [
    // === CHUNKS ===
    {
      name: "Edgar chunk",
      pattern: "src/lib/edgar/**",
      allowImportsFrom: ["src/lib/edgar/**"],
    },
    {
      name: "Market chunk",
      pattern: "src/lib/market/**",
      allowImportsFrom: ["src/lib/market/**", "src/lib/edgar/**"],
    },
    {
      name: "AI chunk",
      pattern: "src/lib/ai/**",
      allowImportsFrom: ["src/lib/ai/**", "src/lib/edgar/**", "src/lib/market/**"],
    },
    {
      name: "Analysis chunk",
      pattern: "src/lib/analysis/**",
      allowImportsFrom: [
        "src/lib/analysis/**",
        "src/lib/edgar/**",
        "src/lib/market/**",
        "src/lib/ai/**",
      ],
    },
    {
      name: "Agent chunk",
      pattern: "src/lib/agent/**",
      allowImportsFrom: [
        "src/lib/agent/**",
        "src/lib/edgar/**",
        "src/lib/market/**",
        "src/lib/ai/**",
        "src/lib/analysis/**",
        "src/lib/metrics/**",
        "src/lib/valuation/**",
        "src/lib/insider/**",
      ],
    },
    {
      name: "Orchestrate chunk",
      pattern: "src/lib/orchestrate/**",
      allowImportsFrom: [
        "src/lib/orchestrate/**",
        "src/lib/edgar/**",
        "src/lib/market/**",
        "src/lib/ai/**",
        "src/lib/analysis/**",
        "src/lib/agent/**",
        "src/lib/metrics/**",
        "src/lib/valuation/**",
        "src/lib/insider/**",
        "src/lib/peers/**",
        "src/lib/earnings-calls/**",
        "src/lib/supabase/**",
      ],
    },
    {
      name: "Metrics chunk",
      pattern: "src/lib/metrics/**",
      allowImportsFrom: [
        "src/lib/metrics/**",
        "src/lib/edgar/**",
        "src/lib/analysis/**",
      ],
    },
    {
      name: "Valuation chunk",
      pattern: "src/lib/valuation/**",
      allowImportsFrom: [
        "src/lib/valuation/**",
        "src/lib/edgar/**",
        "src/lib/market/**",
        "src/lib/analysis/**",
        "src/lib/metrics/**",
      ],
    },
    {
      name: "Insider chunk",
      pattern: "src/lib/insider/**",
      allowImportsFrom: [
        "src/lib/insider/**",
        "src/lib/edgar/**",
        "src/lib/market/**",
      ],
    },
    {
      name: "Peers chunk",
      pattern: "src/lib/peers/**",
      allowImportsFrom: [
        "src/lib/peers/**",
        "src/lib/edgar/**",
        "src/lib/analysis/**",
        "src/lib/metrics/**",
      ],
    },
    {
      name: "Watchlist chunk",
      pattern: "src/lib/watchlist/**",
      allowImportsFrom: ["src/lib/watchlist/**"],
    },
    {
      name: "Filing diff chunk",
      pattern: "src/lib/filing-diff/**",
      allowImportsFrom: [
        "src/lib/filing-diff/**",
        "src/lib/edgar/**",
        "src/lib/ai/**",
      ],
    },
    {
      name: "RAG chunk",
      pattern: "src/lib/rag/**",
      allowImportsFrom: [
        "src/lib/rag/**",
        "src/lib/edgar/**",
        "src/lib/ai/**",
        "src/lib/metrics/**",
        "src/lib/analysis/**",
        "src/lib/supabase/**",
      ],
    },
    {
      name: "Guidance chunk",
      pattern: "src/lib/guidance/**",
      allowImportsFrom: [
        "src/lib/guidance/**",
        "src/lib/edgar/**",
        "src/lib/ai/**",
      ],
    },
    {
      name: "Earnings calls chunk",
      pattern: "src/lib/earnings-calls/**",
      allowImportsFrom: [
        "src/lib/earnings-calls/**",
        "src/lib/edgar/**",
        "src/lib/guidance/**",
        "src/lib/rag/**",
        "src/lib/supabase/**",
        "src/lib/ai/**",
      ],
    },
    {
      name: "FRED chunk",
      pattern: "src/lib/fred/**",
      allowImportsFrom: ["src/lib/fred/**", "src/lib/supabase/**"],
    },
    // === INFRA ===
    {
      name: "Supabase layer",
      pattern: "src/lib/supabase/**",
      allowImportsFrom: ["src/lib/supabase/**"],
    },
    // === ROUTES & APP ===
    {
      name: "Routes shared",
      pattern: ["src/routes/lib/**", "src/routes/types.ts"],
      allowImportsFrom: [
        "src/routes/lib/**",
        "src/routes/types.ts",
        "src/lib/**",
        "src/components/**",
      ],
    },
    {
      name: "Global components",
      pattern: "src/components/**",
      allowImportsFrom: ["src/components/**", "src/lib/**", ...routeSharedImports],
    },
    {
      name: "Home route",
      pattern: "src/routes/home/**",
      allowImportsFrom: ["src/routes/home/**", ...routeSharedImports],
    },
    {
      name: "Watchlist route",
      pattern: "src/routes/watchlist/**",
      allowImportsFrom: ["src/routes/watchlist/**", ...routeSharedImports],
    },
    {
      name: "Company route",
      pattern: "src/routes/company/**",
      allowImportsFrom: ["src/routes/company/**", ...routeSharedImports],
    },
    {
      name: "App pages & API",
      pattern: "src/app/**",
      allowImportsFrom: ["src/routes/**", "src/components/**", "src/lib/**"],
    },
  ],
});
