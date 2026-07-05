import { NextResponse } from "next/server";
import {
  compileCompanyAnalysisIfNeeded,
  getStoredCompanyAnalysisByCik,
  isValidCik,
  normalizeCik,
} from "@/lib/orchestrate";
import { createCompanyAnalysisDeps } from "@/routes/company/[cik]/lib/create-company-analysis-deps";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;

  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const cik = normalizeCik(rawCik);

  try {
    const stored = await getStoredCompanyAnalysisByCik(cik);
    if (!stored) {
      return NextResponse.json(
        {
          status: "missing",
          message:
            "No compiled analysis yet. Open the Documents tab to ingest filings, then analysis will compile automatically.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(stored);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;

  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const cik = normalizeCik(rawCik);
  const body = (await request.json().catch(() => ({}))) as {
    ticker?: string;
    force?: boolean;
  };

  try {
    const deps = createCompanyAnalysisDeps();
    const result = await compileCompanyAnalysisIfNeeded(
      { cik, ticker: body.ticker, force: body.force === true },
      deps,
    );

    return NextResponse.json(result.output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis compile failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
