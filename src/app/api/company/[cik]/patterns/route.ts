import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchPatternTrends } from "@/routes/company/[cik]/lib/fetch-pattern-trends";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;
  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  try {
    const result = await fetchPatternTrends(normalizeCik(rawCik));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pattern trends failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
