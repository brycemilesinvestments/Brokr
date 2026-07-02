/** K3 — Determine whether a filing form carries audited financial statements. */
export function isAuditedForm(form: string): boolean {
  const upper = form.toUpperCase();
  return upper.startsWith("10-K") || upper.startsWith("20-F") || upper.startsWith("40-F");
}

/** K3 — Tag a data point with audited status from its source form. */
export function tagPointAuditStatus<T extends { form: string }>(point: T): T & { audited: boolean } {
  return { ...point, audited: isAuditedForm(point.form) };
}
