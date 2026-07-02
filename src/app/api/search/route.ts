import { formatCik } from "@/lib/edgar/constants";
import { resolveCompany } from "@/lib/edgar/resolve-company";
import { upsertCompaniesFromSearch } from "@/lib/supabase/companies";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  try {
    const result = await resolveCompany(query);

    if (result.kind === "single") {
      await upsertCompaniesFromSearch([
        {
          name: result.company.title,
          edgarId: formatCik(result.company.cik),
          ticker: result.company.ticker,
        },
      ]);

      return NextResponse.json({
        kind: "single",
        company: {
          ...result.company,
          cik: formatCik(result.company.cik),
        },
      });
    }

    if (result.kind === "multiple") {
      await upsertCompaniesFromSearch(
        result.matches.map((match) => ({
          name: match.title,
          edgarId: formatCik(match.cik),
          ticker: match.ticker,
        })),
      );

      return NextResponse.json({
        kind: "multiple",
        matches: result.matches.map(({ score: _score, ...match }) => ({
          ...match,
          cik: formatCik(match.cik),
        })),
      });
    }

    return NextResponse.json({ kind: "none", query: result.query });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
