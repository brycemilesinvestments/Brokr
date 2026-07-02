import { NextResponse } from "next/server";
import { fetchFredStatus } from "@/lib/fred";

export async function GET() {
  try {
    const status = await fetchFredStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FRED status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
