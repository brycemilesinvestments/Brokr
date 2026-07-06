import { formatCik } from "@/lib/edgar/constants";
import { isValidCik } from "@/lib/orchestrate";
import { discoverForm345Filings } from "@/lib/orchestrate/form-345";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ cik: string }>;
};

const FORM345_DESCRIPTION: Record<string, string> = {
  "3": "Initial statement of beneficial ownership",
  "3/A": "Amended initial statement of beneficial ownership",
  "4": "Statement of changes in beneficial ownership",
  "4/A": "Amended statement of changes in beneficial ownership",
  "5": "Annual statement of changes in beneficial ownership",
  "5/A": "Amended annual statement of changes in beneficial ownership",
};

export async function GET(request: Request, { params }: RouteParams) {
  const { cik } = await params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const edgarId = formatCik(cik);
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam && Number.isFinite(Number(limitParam))
    ? Math.min(Math.max(Math.floor(Number(limitParam)), 1), 100)
    : 40;

  try {
    const discovered = await discoverForm345Filings(edgarId, limit);
    const filings = discovered.map((filing) => ({
      type: filing.formType,
      description: FORM345_DESCRIPTION[filing.formType] ?? "Insider ownership filing",
      filingDate: filing.filedDate,
      accessionNumber: filing.accessionNumber,
    }));

    return NextResponse.json({ filings, totalShown: filings.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to discover Form 3/4/5 filings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
