import { formatCik } from "@/lib/edgar/constants";
import { isValidCik } from "@/lib/orchestrate";
import { runForm345Ingestion, type Form345FilingRef } from "@/lib/orchestrate/form-345";
import { NextResponse } from "next/server";

type SyncBody = {
  filings?: Array<{
    accessionNumber?: string;
    filedDate?: string;
    formType?: string;
  }>;
  limit?: number;
};

function parseFilings(body: SyncBody, cik: string): Form345FilingRef[] {
  if (!Array.isArray(body.filings)) return [];

  return body.filings
    .map((filing) => ({
      cik: formatCik(cik),
      accessionNumber: filing.accessionNumber ?? "",
      filedDate: filing.filedDate ?? "",
      formType: filing.formType ?? "4",
    }))
    .filter((filing) => filing.accessionNumber && filing.filedDate);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik } = await context.params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const edgarId = formatCik(cik);
  const body = (await request.json().catch(() => ({}))) as SyncBody;
  const filings = parseFilings(body, edgarId);

  if (filings.length === 0) {
    return NextResponse.json({ error: "No Form 3/4/5 filings provided" }, { status: 400 });
  }

  try {
    const result = await runForm345Ingestion({ filings });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Form 3/4/5 sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
