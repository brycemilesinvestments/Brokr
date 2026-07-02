import { NextResponse } from "next/server";
import { loadWatchlist } from "@/lib/watchlist";
import {
  deleteWatchlistEntry,
  getWatchlistEntries,
  upsertWatchlistEntry,
} from "@/lib/supabase/watchlist";

/** GET /api/watchlist?cik=<cik> — list watchlist entries (all or by CIK). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cik = searchParams.get("cik") ?? undefined;

  const rows = await getWatchlistEntries(cik);
  const entries = loadWatchlist(rows);
  return NextResponse.json(entries);
}

/** POST /api/watchlist — create or update a watchlist entry. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { cik, triggerConfig } = body as {
    cik?: string;
    triggerConfig?: Record<string, unknown>;
  };

  if (!cik || typeof cik !== "string") {
    return NextResponse.json({ error: "cik is required" }, { status: 400 });
  }

  if (!triggerConfig || typeof triggerConfig !== "object") {
    return NextResponse.json(
      { error: "triggerConfig is required" },
      { status: 400 },
    );
  }

  const entry = await upsertWatchlistEntry(cik, triggerConfig);
  if (!entry) {
    return NextResponse.json(
      { error: "Supabase unavailable or write failed" },
      { status: 503 },
    );
  }

  return NextResponse.json(entry, { status: 201 });
}

/** DELETE /api/watchlist?cik=<cik> — remove a watchlist entry. */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const cik = searchParams.get("cik");

  if (!cik) {
    return NextResponse.json({ error: "cik is required" }, { status: 400 });
  }

  const deleted = await deleteWatchlistEntry(cik);
  if (!deleted) {
    return NextResponse.json(
      { error: "Supabase unavailable or delete failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({ deleted: true });
}
