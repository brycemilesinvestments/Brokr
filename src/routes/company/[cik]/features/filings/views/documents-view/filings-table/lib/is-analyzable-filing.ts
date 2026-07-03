/** Form types that run store + ingest + analysis when the Documents tab syncs. */
export function isAnalyzableFiling(formType: string): boolean {
  return /^8-K/i.test(formType) || /^10-K/i.test(formType);
}
