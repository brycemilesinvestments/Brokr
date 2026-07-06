import { formatCik } from "@/lib/edgar/constants";
import { runForm345IngestionForCik } from "@/lib/orchestrate/form-345";
import { fetchStoredInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-stored-insider-transactions";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ cik: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { cik } = await params;
  const edgarId = formatCik(cik);

  try {
    const page = await fetchStoredInsiderTransactions(edgarId);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load insider transactions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { cik } = await params;
  const edgarId = formatCik(cik);

  let limit = 40;
  try {
    const body = (await request.json().catch(() => null)) as { limit?: number } | null;
    if (body?.limit && Number.isFinite(body.limit)) {
      limit = Math.min(Math.max(Math.floor(body.limit), 1), 100);
    }
  } catch {
    // Use default limit when body is absent or invalid.
  }

  try {
    const syncResult = await runForm345IngestionForCik(edgarId, { limit });
    const page = await fetchStoredInsiderTransactions(edgarId);

    return NextResponse.json({
      ...page,
      sync: syncResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form 3/4/5 sync failed" },
      { status: 500 },
    );
  }
}
