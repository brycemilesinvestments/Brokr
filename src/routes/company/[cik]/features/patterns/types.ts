import type { TrendDetectionResult } from "@/lib/metrics/trends";

export type PatternTrendsPayload = TrendDetectionResult & {
  cik: string;
  entityName: string;
};
