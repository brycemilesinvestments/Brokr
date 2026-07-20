import { formatCik } from "@/lib/edgar/constants";
import {
  fetchStoredEarningsCalls,
  syncEarningsCalls,
} from "@/routes/company/[cik]/lib/fetch-earnings-calls";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ cik: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { cik } = await params;
  const edgarId = formatCik(cik);

  try {
    const page = await fetchStoredEarningsCalls(edgarId);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load earnings call transcripts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { cik } = await params;
  const edgarId = formatCik(cik);

  let limit = 10;
  let force = false;
  try {
    const body = (await request.json().catch(() => null)) as {
      limit?: number;
      force?: boolean;
    } | null;
    if (body?.limit && Number.isFinite(body.limit)) {
      limit = Math.min(Math.max(Math.floor(body.limit), 1), 25);
    }
    if (body?.force === true) force = true;
  } catch {
    // Use defaults when body is absent or invalid.
  }

  try {
    const result = await syncEarningsCalls(edgarId, { limit, force });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Earnings call scrape failed" },
      { status: 500 },
    );
  }
}
