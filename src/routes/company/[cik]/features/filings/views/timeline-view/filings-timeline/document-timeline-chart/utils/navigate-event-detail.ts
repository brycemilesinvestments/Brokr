import { resolveFilingPagePath } from "@/lib/edgar/constants";
import type { TimelineEvent } from "../types";

export function fredTabHash(seriesId?: string): string {
  return seriesId ? `#fred/${encodeURIComponent(seriesId)}` : "#fred";
}

export function navigateToFredTab(seriesId?: string): void {
  const hash = fredTabHash(seriesId);
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export function navigateToEventDetail(cik: string, event: TimelineEvent): void {
  if (event.kind === "filing" && event.marker.kind === "filing") {
    const href = resolveFilingPagePath(cik, event.marker.filing);
    if (href) {
      window.location.assign(href);
    }
    return;
  }

  if (event.kind === "fred" && event.marker.kind === "fred") {
    navigateToFredTab(event.marker.event.seriesId);
  }
}
