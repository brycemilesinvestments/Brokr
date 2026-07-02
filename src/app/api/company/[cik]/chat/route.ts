import { NextResponse } from "next/server";
import { createAiClient } from "@/lib/ai";
import { createEdgarClient, formatCik } from "@/lib/edgar";
import { buildMetricSeriesBundle } from "@/lib/edgar/time-series";
import { isValidCik, normalizeCik, fetchLatestIxbrlFacts } from "@/lib/orchestrate";
import {
  createEmbeddingClient,
  createSupabaseChunkStore,
  MemoryChunkStore,
  runRagChat,
} from "@/lib/chat";
import { createAdminClient } from "@/lib/supabase/admin";

function createChatDeps() {
  const admin = createAdminClient();
  const store = admin ? createSupabaseChunkStore(admin) : new MemoryChunkStore();

  return {
    store,
    embedder: createEmbeddingClient(),
    ai: createAiClient(),
    edgar: createEdgarClient({ supabaseClient: admin ?? undefined }),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ cik: string }> },
) {
  const { cik: rawCik } = await context.params;

  if (!isValidCik(rawCik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    periodEnd?: string | null;
    ticker?: string;
  };

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const cik = normalizeCik(rawCik);

  try {
    const deps = createChatDeps();
    const [facts, ixbrlFacts] = await Promise.all([
      deps.edgar.getCompanyFacts(cik),
      fetchLatestIxbrlFacts(cik, deps.edgar).catch(() => []),
    ]);

    const metricBundle = buildMetricSeriesBundle(facts);
    const latestFiling = facts.facts
      ? (() => {
          const allFacts = [];
          for (const taxonomy of Object.values(facts.facts)) {
            for (const concept of Object.values(taxonomy)) {
              for (const unitFacts of Object.values(concept.units ?? {})) {
                allFacts.push(...unitFacts);
              }
            }
          }
          return allFacts.sort(
            (a, b) => Date.parse(String(b.filed)) - Date.parse(String(a.filed)),
          )[0];
        })()
      : undefined;

    const accession = latestFiling?.accn;
    const periodEnd = body.periodEnd ?? latestFiling?.end ?? null;

    const result = await runRagChat(
      {
        ...deps,
        ixbrlFacts: ixbrlFacts.length > 0 ? ixbrlFacts : undefined,
        accession,
        periodEnd,
      },
      {
        companyId: cik,
        companyName: facts.entityName,
        question,
        periodEnd,
        metricBundle,
        companyFacts: facts,
      },
    );

    return NextResponse.json({
      ...result,
      cik: formatCik(cik),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
