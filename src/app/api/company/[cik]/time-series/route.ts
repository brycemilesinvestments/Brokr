import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchFinancialTrends } from "@/routes/company/[cik]/features/financial-trends/lib/fetch-financial-trends";

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
    const data = await fetchFinancialTrends(cik);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load time series";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
