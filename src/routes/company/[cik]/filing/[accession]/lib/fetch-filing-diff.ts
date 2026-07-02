import type { ProseSections } from "@/lib/edgar/discovery";
import { createEdgarClient } from "@/lib/edgar";
import type { XbrlFact } from "@/lib/edgar";
import {
  pairFilings,
  runFilingDiffRouter,
  type FilingDiffOutput,
  type NumericMetricMap,
} from "@/lib/filing-diff";
import {
  analyzeFilingDiscovery,
  createSignalCache,
} from "@/lib/orchestrate/filing-discovery";
import { fetchFilingDetail } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-detail";
import { getFilingDiffCache } from "@/routes/lib/runtime-caches";
import { createAdminClient } from "@/lib/supabase/admin";

function metricsFromFacts(facts: XbrlFact[]): NumericMetricMap {
  const map: NumericMetricMap = {};
  for (const fact of facts) {
    if (fact.numericValue == null) continue;
    map[`${fact.taxonomy}:${fact.concept}`] = fact.numericValue;
  }
  return map;
}

async function loadProseForAccession(
  cik: string,
  accessionNumber: string,
  companyFacts: Awaited<ReturnType<ReturnType<typeof createEdgarClient>["getCompanyFacts"]>>,
  edgar: ReturnType<typeof createEdgarClient>,
): Promise<{ prose: ProseSections; metrics: NumericMetricMap }> {
  const filing = await fetchFilingDetail(cik, accessionNumber);
  const xbrl = await edgar.fetchFilingXbrl(cik, accessionNumber, filing.documents);
  const ixbrlFacts = xbrl.documents.flatMap((doc) => doc.facts);

  let ai;
  try {
    const { createAiClient } = await import("@/lib/ai");
    ai = createAiClient();
  } catch {
    ai = undefined;
  }

  const discovery = await analyzeFilingDiscovery({
    cik,
    accessionNumber,
    companyFacts,
    ixbrlFacts,
    cache: createSignalCache({ supabaseClient: createAdminClient() ?? undefined }),
    ai,
  });

  return {
    prose: discovery.proseSections,
    metrics: metricsFromFacts(ixbrlFacts),
  };
}

export type FilingDiffPayload =
  | { status: "ok"; diff: FilingDiffOutput }
  | { status: "no_pair"; message: string }
  | { status: "error"; message: string };

export async function fetchFilingDiff(
  cik: string,
  accessionNumber: string,
): Promise<FilingDiffPayload> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await edgar.getSubmissions(cik);
  const pair = pairFilings(cik, submissions.filings, accessionNumber);

  if (!pair) {
    return {
      status: "no_pair",
      message: "No comparable prior filing found for this accession.",
    };
  }

  const companyFacts = await edgar.getCompanyFacts(cik);

  const [currentData, previousData] = await Promise.all([
    loadProseForAccession(cik, pair.current.accessionNumber, companyFacts, edgar),
    loadProseForAccession(cik, pair.previous.accessionNumber, companyFacts, edgar),
  ]);

  try {
    const diff = await runFilingDiffRouter({
      cik,
      accessionNumber,
      filings: submissions.filings,
      metricsByAccession: {
        [pair.current.accessionNumber]: currentData.metrics,
        [pair.previous.accessionNumber]: previousData.metrics,
      },
      proseByAccession: {
        [pair.current.accessionNumber]: currentData.prose,
        [pair.previous.accessionNumber]: previousData.prose,
      },
      cache: getFilingDiffCache(),
    });

    return { status: "ok", diff };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Filing diff failed",
    };
  }
}
