import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchStockHistory } from "@/routes/company/[cik]/lib/fetch-stock-history";

export async function GET(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;
  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const now = Math.floor(Date.now() / 1000);
  const period2 = Number(searchParams.get("to") ?? now);
  const period1 = Number(searchParams.get("from") ?? period2 - 365 * 24 * 60 * 60);

  if (!Number.isFinite(period1) || !Number.isFinite(period2) || period1 >= period2) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const result = await fetchStockHistory(normalizeCik(rawCik), { period1, period2 });
    if (!result) {
      return NextResponse.json({ error: "No ticker found for this company" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stock history fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
