import type { FilingDocument } from "@/routes/company/[cik]/filing/[accession]/types";
import { filingDocumentViewUrl } from "@/routes/company/[cik]/filing/[accession]/lib/filing-document-view-url";
import { isEmbeddableFilingDocument } from "@/routes/company/[cik]/filing/[accession]/lib/is-embeddable-filing-document";

type FilingDocumentViewersProps = {
  cik: string;
  accessionNumber: string;
  documents: FilingDocument[];
};

export function FilingDocumentViewers({
  cik,
  accessionNumber,
  documents,
}: FilingDocumentViewersProps) {
  const embeddableDocuments = documents
    .map((document) => ({
      document,
      viewUrl: document.documentUrl ? filingDocumentViewUrl(cik, accessionNumber, document.documentUrl) : undefined,
    }))
    .filter(
      (entry): entry is { document: FilingDocument; viewUrl: string } =>
        Boolean(entry.viewUrl && isEmbeddableFilingDocument(entry.document)),
    );
  const otherDocuments = documents.filter((document) => !isEmbeddableFilingDocument(document));

  if (documents.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          No documents found for this filing.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Filing documents</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {embeddableDocuments.length} viewer{embeddableDocuments.length === 1 ? "" : "s"}
            {otherDocuments.length > 0
              ? ` · ${otherDocuments.length} additional file${otherDocuments.length === 1 ? "" : "s"} linked below`
              : ""}
          </p>
        </div>

        <div className="divide-y divide-zinc-100">
          {embeddableDocuments.map(({ document, viewUrl }, index) => (
            <article key={`${document.documentName}-${index}`} className="px-6 py-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {document.description || document.documentName}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{document.documentName}</p>
                </div>
                {document.documentUrl ? (
                  <a
                    href={document.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Open on SEC
                  </a>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                <iframe
                  title={document.description || document.documentName}
                  src={viewUrl}
                  className="h-[min(80vh,900px)] w-full bg-white"
                  loading="lazy"
                  sandbox="allow-scripts allow-popups allow-forms"
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      {otherDocuments.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">Other files</h3>
            <p className="mt-1 text-sm text-zinc-500">
              These attachments are not HTML and open on SEC.gov.
            </p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {otherDocuments.map((document, index) => (
              <li
                key={`${document.documentName}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-800">{document.description || document.documentName}</p>
                  <p className="font-mono text-xs text-zinc-500">{document.documentName}</p>
                </div>
                {document.documentUrl ? (
                  <a
                    href={document.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
