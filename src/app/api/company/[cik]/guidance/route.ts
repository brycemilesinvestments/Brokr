import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchGuidance } from "@/routes/company/[cik]/lib/fetch-guidance";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;
  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  try {
    const result = await fetchGuidance(normalizeCik(rawCik));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Guidance ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
