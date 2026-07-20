export type {
  DiscoverTranscriptsInput,
  EarningsCallScrapeResult,
  IngestTranscriptResult,
  ScrapeTranscriptFailure,
  ScrapeTranscriptResult,
  TranscriptCandidate,
  TranscriptSourceType,
} from "@/lib/earnings-calls/types";

export {
  BROKR_USER_AGENT,
  EARNINGS_CALL_SECTION_KEY,
  IR_CRAWL_PATHS,
  MIN_TRANSCRIPT_CHARS,
  TRANSCRIPT_LINK_PATTERN,
} from "@/lib/earnings-calls/constants";

export { fetchWebPage } from "@/lib/earnings-calls/fetch-web";
export { resolveInvestorWebsite } from "@/lib/earnings-calls/resolve-investor-website";
export {
  discoverTranscriptsFromSec,
  pickTranscriptDocumentsFromItems,
} from "@/lib/earnings-calls/discover-from-sec";
export {
  discoverTranscriptsFromIr,
  extractTranscriptLinksFromHtml,
} from "@/lib/earnings-calls/discover-from-ir";
export { discoverTranscriptCandidates } from "@/lib/earnings-calls/discover-transcripts";
export {
  isValidTranscriptText,
  parseTranscriptHtml,
} from "@/lib/earnings-calls/parse-transcript-html";
export {
  buildSyntheticAccession,
  scrapeTranscript,
} from "@/lib/earnings-calls/scrape-transcript";
export { ingestTranscript } from "@/lib/earnings-calls/ingest-transcript";
export { runEarningsCallScrape } from "@/lib/earnings-calls/run";
