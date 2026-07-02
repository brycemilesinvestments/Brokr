import { NextResponse } from "next/server";
import { fetchFredTimelineEvents } from "@/lib/fred";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultFromDate(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 5);
  return date.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? defaultFromDate();
  const to = searchParams.get("to") ?? defaultToDate();

  if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const payload = await fetchFredTimelineEvents(from, to);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FRED timeline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
