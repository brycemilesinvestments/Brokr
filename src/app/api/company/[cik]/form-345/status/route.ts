import { formatCik } from "@/lib/edgar/constants";
import { isValidCik } from "@/lib/orchestrate";
import { getForm345ProcessedStatus } from "@/lib/supabase/form345";
import { NextResponse } from "next/server";

type StatusBody = {
  accessions?: string[];
};

export async function POST(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik } = await context.params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  formatCik(cik);

  const body = (await request.json().catch(() => ({}))) as StatusBody;
  const accessions = Array.isArray(body.accessions)
    ? body.accessions.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  try {
    const status = await getForm345ProcessedStatus(accessions);
    return NextResponse.json({ status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Form 3/4/5 status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
