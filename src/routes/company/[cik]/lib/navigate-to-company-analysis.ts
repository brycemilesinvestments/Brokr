import { formatCik } from "@/lib/edgar/constants";

type NavigateRouter = {
  push: (href: string) => void;
};

export function companyAnalysisHref(cik: string): string {
  return `/company/${formatCik(cik)}/analysis`;
}

/** Navigate to a company's analysis page. */
export function navigateToCompanyAnalysis(
  cik: string,
  options: {
    router: NavigateRouter;
    currentCik?: string;
  },
): void {
  const href = companyAnalysisHref(cik);
  options.router.push(href);
}
