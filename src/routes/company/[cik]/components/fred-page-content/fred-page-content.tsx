"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { FredPanel } from "@/routes/company/[cik]/features/fred";
import { companyTabPath } from "@/routes/company/[cik]/lib/company-tab-paths";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";

export function FredPageContent() {
  const { cik, ticker, sidebarMenuButton } = useCompanyLayoutShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSeriesId = searchParams.get("series");

  const handleSelectedSeriesIdChange = useCallback(
    (seriesId: string | null) => {
      const nextPath = companyTabPath(cik, "fred", { fredSeriesId: seriesId });
      router.replace(nextPath, { scroll: false });
    },
    [cik, router],
  );

  return (
    <FredPanel
      enabled
      ticker={ticker}
      selectedSeriesId={selectedSeriesId}
      onSelectedSeriesIdChange={handleSelectedSeriesIdChange}
      headerLeading={sidebarMenuButton}
    />
  );
}
