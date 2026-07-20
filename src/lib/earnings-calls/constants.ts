export const BROKR_USER_AGENT =
  "Mozilla/5.0 (compatible; Brokr/1.0; +https://github.com/brycemilesinvestments/Brokr)";

export const TRANSCRIPT_LINK_PATTERN =
  /transcript|earnings[\s_-]?call|conference[\s_-]?call|results[\s_-]?call/i;

export const TRANSCRIPT_FILENAME_PATTERN =
  /transcript|earnings[\s_-]?call|conference[\s_-]?call/i;

export const MIN_TRANSCRIPT_CHARS = 1_500;

export const IR_CRAWL_PATHS = [
  "",
  "/events-and-presentations",
  "/events",
  "/news-events",
  "/news-events/events-and-presentations",
  "/financial-information/quarterly-results",
  "/investor-relations",
  "/investors",
  "/events-presentations",
  "/financials/quarterly-results",
] as const;

export const EARNINGS_CALL_SECTION_KEY = "earnings_call_transcript" as const;
