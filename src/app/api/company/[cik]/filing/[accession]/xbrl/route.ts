import { NextResponse } from "next/server";
import { fetchFilingDetail } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-detail";
import { fetchFilingXbrl } from "@/lib/edgar/xbrl/fetch-filing-xbrl";

type RouteContext = {
  params: Promise<{ cik: string; accession: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { cik, accession } = await context.params;
  const accessionNumber = decodeURIComponent(accession);
  const { searchParams } = new URL(request.url);
  const documentName = searchParams.get("document") ?? undefined;

  let filing;
  try {
    filing = await fetchFilingDetail(cik, accessionNumber);
  } catch {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  const extraction = await fetchFilingXbrl(cik, accessionNumber, filing.documents, {
    documentName,
  });

  return NextResponse.json(extraction);
}
