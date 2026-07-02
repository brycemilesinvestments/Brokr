/** SEC Form 8-K item code labels (Items 1.01–9.01). */
export const FORM_8K_ITEM_LABELS: Record<string, string> = {
  "1.01": "Entry into a Material Definitive Agreement",
  "1.02": "Termination of a Material Definitive Agreement",
  "1.03": "Bankruptcy or Receivership",
  "1.04": "Mine Safety - Reporting of Shutdowns and Patterns of Violations",
  "1.05": "Material Cybersecurity Incidents",
  "2.01": "Completion of Acquisition or Disposition of Assets",
  "2.02": "Results of Operations and Financial Condition",
  "2.03": "Creation of a Direct Financial Obligation or an Obligation under an Off-Balance Sheet Arrangement",
  "2.04": "Triggering Events That Accelerate or Increase a Direct Financial Obligation",
  "2.05": "Costs Associated with Exit or Disposal Activities",
  "2.06": "Material Impairments",
  "3.01": "Notice of Delisting or Failure to Satisfy a Continued Listing Rule or Standard",
  "3.02": "Unregistered Sales of Equity Securities",
  "3.03": "Material Modification to Rights of Security Holders",
  "4.01": "Changes in Registrant's Certifying Accountant",
  "4.02": "Non-Reliance on Previously Issued Financial Statements or a Related Audit Report or Completed Interim Review",
  "5.01": "Changes in Control of Registrant",
  "5.02": "Departure of Directors or Certain Officers; Election of Directors; Appointment of Certain Officers",
  "5.03": "Amendments to Articles of Incorporation or Bylaws; Change in Fiscal Year",
  "5.04": "Temporary Suspension of Trading Under Registrant's Employee Benefit Plans",
  "5.05": "Amendments to the Registrant's Code of Ethics, or Waiver of a Provision of the Code of Ethics",
  "5.06": "Change in Shell Company Status",
  "5.07": "Submission of Matters to a Vote of Security Holders",
  "5.08": "Shareholder Director Nominations",
  "6.01": "ABS Informational and Computational Material",
  "6.02": "Change of Servicer or Trustee",
  "6.03": "Change in Credit Enhancement or Other External Support",
  "6.04": "Failure to Make a Required Distribution",
  "6.05": "Securities Act Updating Disclosure",
  "6.06": "Static Pool",
  "7.01": "Regulation FD Disclosure",
  "8.01": "Other Events",
  "9.01": "Financial Statements and Exhibits",
};

/** Map primary item codes to coarse event types for routing. */
export const FORM_8K_EVENT_TYPES: Record<string, string> = {
  "1.01": "material_agreement",
  "1.02": "agreement_termination",
  "1.03": "bankruptcy",
  "1.05": "cybersecurity_incident",
  "2.01": "acquisition_disposition",
  "2.02": "earnings_release",
  "2.03": "financial_obligation",
  "2.04": "financial_obligation_trigger",
  "2.05": "exit_costs",
  "2.06": "material_impairment",
  "3.01": "delisting_notice",
  "3.02": "unregistered_equity_sale",
  "3.03": "rights_modification",
  "4.01": "auditor_change",
  "4.02": "financial_restatement",
  "5.01": "change_in_control",
  "5.02": "officer_change",
  "5.03": "charter_amendment",
  "5.07": "shareholder_vote",
  "7.01": "regulation_fd",
  "8.01": "other_event",
  "9.01": "exhibits_only",
};

export function parseItemCodes(items: string | undefined | null): string[] {
  if (!items) return [];
  return items
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function labelItemCode(code: string): string {
  return FORM_8K_ITEM_LABELS[code] ?? `Item ${code}`;
}

export function inferPrimaryEventType(itemCodes: string[]): string {
  const substantive = itemCodes.filter((code) => code !== "9.01");
  const ordered = substantive.length > 0 ? substantive : itemCodes;

  for (const code of ordered) {
    const eventType = FORM_8K_EVENT_TYPES[code];
    if (eventType) return eventType;
  }

  return "unknown";
}
