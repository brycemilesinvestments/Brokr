import { NextResponse } from "next/server";
import { isValidCik } from "@/lib/orchestrate";
import { fetchFilingDocumentHtml } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-document-html";

type RouteContext = {
  params: Promise<{ cik: string; accession: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { cik, accession } = await context.params;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const accessionNumber = decodeURIComponent(accession);
  const archivePath = new URL(request.url).searchParams.get("path")?.trim();
  if (!archivePath) {
    return NextResponse.json({ error: "path query parameter is required" }, { status: 400 });
  }

  try {
    const html = await fetchFilingDocumentHtml(cik, accessionNumber, archivePath);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load document";
    const status = message.includes("Invalid document") ? 400 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
