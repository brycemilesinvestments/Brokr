import { NextResponse } from "next/server";
import { runFredIngestion } from "@/lib/fred";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") !== "false";

  try {
    const result = await runFredIngestion({ force });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FRED ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
