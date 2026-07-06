import { NextResponse } from "next/server";
import { isValidCik } from "@/lib/orchestrate";
import { fetchCompanyFilings } from "@/routes/company/[cik]/lib/fetch-company-filings";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik } = await context.params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  try {
    const page = await fetchCompanyFilings(cik);
    return NextResponse.json({
      filings: page.filings,
      totalShown: page.totalShown,
      hasMoreFilings: page.hasMoreFilings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load filings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
