import { NextResponse } from "next/server";
import { isClientDisconnected } from "@/lib/orchestrate/client-abort";
import { isValidCik } from "@/lib/orchestrate";
import {
  analyzeCompanyFiling,
  ensureCompany,
} from "@/lib/orchestrate/company-filings";

type AnalyzeBody = {
  accessionNumber?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik } = await context.params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as AnalyzeBody;
  const accessionNumber = body.accessionNumber?.trim();
  if (!accessionNumber) {
    return NextResponse.json({ error: "accessionNumber is required" }, { status: 400 });
  }

  try {
    const company = await ensureCompany(cik);
    const result = await analyzeCompanyFiling(company, accessionNumber, {
      signal: request.signal,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isClientDisconnected(error)) {
      return NextResponse.json({ error: "Client disconnected" }, { status: 499 });
    }
    const message = error instanceof Error ? error.message : "Analysis failed";
    const status = message.includes("must be stored") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
