import { Suspense } from "react";
import { FredPageContent } from "@/routes/company/[cik]/components/fred-page-content/fred-page-content";

export default function FredPage() {
  return (
    <Suspense>
      <FredPageContent />
    </Suspense>
  );
}
