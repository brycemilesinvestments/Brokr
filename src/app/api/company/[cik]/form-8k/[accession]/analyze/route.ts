import { formatCik } from "@/lib/edgar/constants";
import { runForm8kSync } from "@/lib/orchestrate/form-8k";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ cik: string; accession: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  const { cik, accession } = await params;
  const edgarId = formatCik(cik);
  const accessionNumber = decodeURIComponent(accession);

  try {
    const result = await runForm8kSync(edgarId, { accessionNumber });
    const item = result.processed[0];

    if (!item && result.errors.length > 0) {
      return NextResponse.json({ error: result.errors[0]?.message ?? "Analysis failed" }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ error: "8-K filing not found" }, { status: 404 });
    }

    return NextResponse.json({
      companyId: result.company.id,
      edgarId: result.company.edgar_id,
      accessionNumber: item.accessionNumber,
      skippedStore: item.stored.skipped,
      chunksStored: item.ingest.chunksStored,
      classification: item.classification,
      costUsd: item.costUsd,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "8-K analysis failed" },
      { status: 500 },
    );
  }
}
