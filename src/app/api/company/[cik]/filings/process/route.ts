import { NextResponse } from "next/server";
import { isClientDisconnected } from "@/lib/orchestrate/client-abort";
import { isValidCik } from "@/lib/orchestrate";
import {
  ensureCompany,
  isStorableFormType,
  processCompanyFiling,
  toFilingRef,
  type StoreableFilingInput,
} from "@/lib/orchestrate/company-filings";

export async function POST(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik } = await context.params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const body = (await request.json()) as Partial<StoreableFilingInput>;
  const accessionNumber = body.accessionNumber?.trim();
  const formType = body.formType?.trim();
  const filingDate = body.filingDate?.trim();

  if (!accessionNumber || !formType || !filingDate) {
    return NextResponse.json(
      { error: "accessionNumber, formType, and filingDate are required" },
      { status: 400 },
    );
  }

  if (!isStorableFormType(formType)) {
    return NextResponse.json({ error: `Unsupported form type: ${formType}` }, { status: 400 });
  }

  try {
    const company = await ensureCompany(cik);
    const result = await processCompanyFiling(
      company,
      toFilingRef(cik, {
        accessionNumber,
        formType,
        filingDate,
        reportDate: body.reportDate ?? null,
        items: body.items ?? null,
        primaryDocument: body.primaryDocument ?? null,
      }),
      { signal: request.signal },
    );

    return NextResponse.json(result);
  } catch (error) {
    if (isClientDisconnected(error)) {
      return NextResponse.json({ error: "Client disconnected" }, { status: 499 });
    }
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
