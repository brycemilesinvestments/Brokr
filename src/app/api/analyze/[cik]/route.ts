import { NextResponse } from "next/server";
import { createEdgarClient } from "@/lib/edgar";
import { buildFilingDateLookup, toEventStudyTransactions } from "@/lib/insider";
import {
  wireHandlers,
  isValidCik,
  normalizeCik,
  fetchLatestIxbrlFacts,
} from "@/lib/orchestrate";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-insider-transactions";

async function loadEventStudyTransactions(cik: string) {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });

  const [page, submissions] = await Promise.all([
    fetchInsiderTransactions(cik).catch(() => null),
    edgar.getSubmissions(cik).catch(() => null),
  ]);

  if (!page) return [];

  const filingDateByAccession = buildFilingDateLookup(submissions?.filings ?? []);
  return toEventStudyTransactions(page.transactions, filingDateByAccession);
}

function createAnalyzeHandlers() {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });

  return wireHandlers({
    edgar,
    fetchInsiderTransactions: loadEventStudyTransactions,
    fetchIxbrlFacts: (cik) => fetchLatestIxbrlFacts(cik, edgar),
  });
}

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
    const { analyzeQuarter } = createAnalyzeHandlers();
    const result = await analyzeQuarter({ cik });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
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
    fiscalYear?: number;
    fiscalPeriod?: string;
  };

  try {
    const { analyzeCompany } = createAnalyzeHandlers();
    const result = await analyzeCompany({ cik, ticker: body.ticker });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
