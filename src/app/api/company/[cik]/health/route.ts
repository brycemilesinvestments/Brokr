import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchHealthScore } from "@/routes/company/[cik]/lib/fetch-health-score";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;
  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  try {
    const result = await fetchHealthScore(normalizeCik(rawCik));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health score failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
