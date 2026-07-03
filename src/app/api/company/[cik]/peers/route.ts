import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchPeerComparison } from "@/routes/company/[cik]/lib/fetch-peer-comparison";

export async function GET(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;
  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "true";
    const result = await fetchPeerComparison(normalizeCik(rawCik), { refresh });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Peer comparison failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
