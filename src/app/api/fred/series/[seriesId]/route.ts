import { NextResponse } from "next/server";
import { FRED_OBSERVATION_START } from "@/lib/fred";
import { fetchFredSeriesObservations } from "@/lib/fred/fetch-series-observations";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type RouteContext = {
  params: Promise<{ seriesId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { seriesId } = await context.params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? FRED_OBSERVATION_START;
  const to = searchParams.get("to") ?? defaultToDate();

  if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const payload = await fetchFredSeriesObservations(seriesId, from, to);
    if (!payload) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FRED series";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
