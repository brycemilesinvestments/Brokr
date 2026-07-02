/** Filing detail page domain types — /company/[cik]/filing/[accession] */

import type { FilingDiscoveryOutput } from "@/lib/orchestrate/filing-discovery";

export type FilingDocument = {
  sequence?: string;
  description: string;
  documentName: string;
  documentUrl: string;
  type?: string;
  size?: string;
};

export type FilingParty = {
  name: string;
  role?: string;
  cik?: string;
  roleUrl?: string;
  filingsUrl?: string;
  mailingAddress: string[];
  businessAddress: string[];
  identInfo?: string;
};

export type FilingDetailPage = {
  cik: string;
  accessionNumber: string;
  formType: string;
  formDescription: string;
  filingDate?: string;
  accepted?: string;
  documentCount?: string;
  periodOfReport?: string;
  documents: FilingDocument[];
  parties: FilingParty[];
  secUrl: string;
};

export type FilingDetailProps = {
  filing: FilingDetailPage;
  companyName?: string;
  discovery?: FilingDiscoveryOutput;
};
