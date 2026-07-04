export function citationHref(cik: string, accession: string) {
  const normalized = accession.replace(/-/g, "");
  return `/company/${cik}/filing/${normalized}`;
}
