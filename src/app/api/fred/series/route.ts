import { NextResponse } from "next/server";
import { fetchFredSeriesCatalog } from "@/lib/fred/fetch-series-observations";

export async function GET() {
  try {
    const series = await fetchFredSeriesCatalog();
    return NextResponse.json({ series });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FRED series";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
