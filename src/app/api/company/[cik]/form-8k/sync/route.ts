import { formatCik } from "@/lib/edgar/constants";
import { runForm8kSync } from "@/lib/orchestrate/form-8k";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ cik: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  const { cik } = await params;
  const edgarId = formatCik(cik);

  try {
    const result = await runForm8kSync(edgarId);
    return NextResponse.json({
      companyId: result.company.id,
      edgarId: result.company.edgar_id,
      processedCount: result.processed.length,
      errorCount: result.errors.length,
      processed: result.processed.map((item) => ({
        accessionNumber: item.accessionNumber,
        skippedStore: item.stored.skipped,
        chunksStored: item.ingest.chunksStored,
        classification: item.classification,
        costUsd: item.costUsd,
      })),
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "8-K sync failed" },
      { status: 500 },
    );
  }
}
