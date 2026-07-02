import type { FilingDocument } from "@/routes/company/[cik]/filing/[accession]/types";
import { isXbrlFactDocument, isXbrlTaxonomyDocument } from "@/lib/edgar/xbrl/document-kind";
import { formatBytes } from "../utils/format-bytes";

type DocumentsTableProps = {
  documents: FilingDocument[];
};

export function DocumentsTable({ documents }: DocumentsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Document format files</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {documents.length} document{documents.length === 1 ? "" : "s"} in this
          submission
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-6 py-3">Seq</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Document</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {documents.map((document, index) => (
              <tr key={`${document.documentName}-${index}`} className="hover:bg-zinc-50/80">
                <td className="px-6 py-4 text-zinc-600">{document.sequence ?? "—"}</td>
                <td className="px-6 py-4 text-zinc-700">{document.description}</td>
                <td className="px-6 py-4">
                  {document.documentUrl ? (
                    <a
                      href={document.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-emerald-700 hover:underline"
                    >
                      {document.documentName}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-zinc-500">{document.documentName}</span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{document.type ?? "—"}</span>
                    {isXbrlFactDocument(document) ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Facts
                      </span>
                    ) : null}
                    {isXbrlTaxonomyDocument(document) ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        Taxonomy
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600">{formatBytes(document.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {documents.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          No documents found for this filing.
        </div>
      ) : null}
    </section>
  );
}
