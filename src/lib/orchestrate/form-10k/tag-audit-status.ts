import { isAuditedForm } from "@/lib/edgar/time-series/audit-status";

/** K3 — Tag filing-level audited status from form type. */
export function tagFilingAuditStatus(form: string): boolean {
  return isAuditedForm(form);
}
