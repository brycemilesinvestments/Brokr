import { NextResponse } from "next/server";
import { isValidCik, normalizeCik } from "@/lib/orchestrate";
import { fetchFilingDiff } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-diff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cik: string; accession: string }> },
) {
  const { cik: rawCik, accession } = await context.params;
  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const accessionNumber = decodeURIComponent(accession);

  try {
    const result = await fetchFilingDiff(normalizeCik(rawCik), accessionNumber);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Filing diff failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
