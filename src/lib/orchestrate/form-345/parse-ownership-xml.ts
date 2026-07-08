import type { ParsedOwnershipFiling, ParsedOwnershipRow } from "@/lib/orchestrate/form-345/types";

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function extractValue(block: string, tag: string): string | null {
  const tagBlock = extractBlocks(block, tag)[0];
  if (tagBlock) {
    const valueMatch = tagBlock.match(/<value\b[^>]*>([\s\S]*?)<\/value>/i);
    if (valueMatch) {
      return decodeXmlEntities(valueMatch[1].trim());
    }

    const innerMatch = tagBlock.match(
      new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
    );
    if (innerMatch) {
      const inner = innerMatch[1].trim();
      if (inner && !inner.startsWith("<")) {
        return decodeXmlEntities(inner);
      }
    }
  }

  const wrapped = new RegExp(
    `<${tag}\\b[^>]*>\\s*<value>([\\s\\S]*?)<\\/value>\\s*<\\/${tag}>`,
    "i",
  );
  const wrappedMatch = block.match(wrapped);
  if (wrappedMatch) {
    return decodeXmlEntities(wrappedMatch[1].trim());
  }

  const direct = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const directMatch = block.match(direct);
  if (!directMatch) return null;

  const inner = directMatch[1].trim();
  if (!inner || inner.startsWith("<")) return null;
  return decodeXmlEntities(inner);
}

function extractFootnoteIds(block: string): string[] {
  const ids: string[] = [];
  const re = /<footnoteId\b[^>]*\bid="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function parseBooleanFlag(raw: string | null): boolean | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "y" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "n" || normalized === "no") {
    return false;
  }
  return null;
}

function parseNumber(raw: string | null): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFootnotes(xml: string): Record<string, string> {
  const footnotes: Record<string, string> = {};
  const footnotesBlock = extractBlocks(xml, "footnotes")[0];
  if (!footnotesBlock) return footnotes;

  for (const block of extractBlocks(footnotesBlock, "footnote")) {
    const idMatch = block.match(/\bid="([^"]+)"/);
    const textMatch = block.match(/<footnote\b[^>]*>([\s\S]*?)<\/footnote>/i);
    if (!idMatch || !textMatch) continue;
    footnotes[idMatch[1]] = decodeXmlEntities(textMatch[1].trim());
  }

  return footnotes;
}

function resolveFootnoteText(ids: string[], footnotes: Record<string, string>): string | null {
  if (ids.length === 0) return null;
  const texts = ids.map((id) => footnotes[id]).filter(Boolean);
  return texts.length > 0 ? texts.join("\n\n") : null;
}

function parseReportingOwner(xml: string): {
  reportingOwnerName: string;
  reportingOwnerCik: string | null;
  isDirector: boolean | null;
  isOfficer: boolean | null;
  isTenPctOwner: boolean | null;
  isOther: boolean | null;
  officerTitle: string | null;
} {
  const ownerBlock = extractBlocks(xml, "reportingOwner")[0] ?? xml;
  const relationshipBlock = extractBlocks(ownerBlock, "reportingOwnerRelationship")[0] ?? ownerBlock;

  return {
    reportingOwnerName:
      extractValue(ownerBlock, "rptOwnerName") ??
      extractValue(ownerBlock, "rptOwnerName") ??
      "Unknown",
    reportingOwnerCik: extractValue(ownerBlock, "rptOwnerCik"),
    isDirector: parseBooleanFlag(extractValue(relationshipBlock, "isDirector")),
    isOfficer: parseBooleanFlag(extractValue(relationshipBlock, "isOfficer")),
    isTenPctOwner: parseBooleanFlag(extractValue(relationshipBlock, "isTenPercentOwner")),
    isOther: parseBooleanFlag(extractValue(relationshipBlock, "isOther")),
    officerTitle: extractValue(relationshipBlock, "officerTitle"),
  };
}

type OwnerContext = {
  issuerCik: string;
  issuerName: string | null;
  ticker: string | null;
  reportingOwnerName: string;
  reportingOwnerCik: string | null;
  isDirector: boolean | null;
  isOfficer: boolean | null;
  isTenPctOwner: boolean | null;
  isOther: boolean | null;
  officerTitle: string | null;
  is10b51Checkbox: boolean | null;
};

function parseTransactionBlock(
  block: string,
  isDerivative: boolean,
  shared: OwnerContext,
  footnotes: Record<string, string>,
  lineIndex: number,
): ParsedOwnershipRow {
  const codingBlock = extractBlocks(block, "transactionCoding")[0] ?? block;
  const amountsBlock = extractBlocks(block, "transactionAmounts")[0] ?? block;
  const postBlock = extractBlocks(block, "postTransactionAmounts")[0] ?? block;
  const natureBlock = extractBlocks(block, "ownershipNature")[0] ?? block;

  const footnoteIds = [
    ...extractFootnoteIds(block),
    ...extractFootnoteIds(codingBlock),
    ...extractFootnoteIds(amountsBlock),
    ...extractFootnoteIds(natureBlock),
  ];
  const uniqueFootnoteIds = [...new Set(footnoteIds)];

  const securityTitle =
    extractValue(block, "securityTitle") ??
    extractValue(block, "underlyingSecurityTitle") ??
    "Unknown security";

  return {
    lineIndex,
    ...shared,
    securityTitle,
    isDerivative,
    transactionCode: extractValue(codingBlock, "transactionCode"),
    transactionDate: extractValue(block, "transactionDate"),
    sharesAmount: parseNumber(extractValue(amountsBlock, "transactionShares")),
    acquiredOrDisposed: extractValue(amountsBlock, "transactionAcquiredDisposedCode"),
    pricePerShare: parseNumber(extractValue(amountsBlock, "transactionPricePerShare")),
    sharesOwnedFollowing: parseNumber(
      extractValue(postBlock, "sharesOwnedFollowingTransaction"),
    ),
    ownershipForm: extractValue(natureBlock, "directOrIndirectOwnership"),
    natureOfIndirectOwnership: extractValue(natureBlock, "natureOfOwnership"),
    footnoteIds: uniqueFootnoteIds,
    footnoteRawText: resolveFootnoteText(uniqueFootnoteIds, footnotes),
  };
}

function parseHoldingBlock(
  block: string,
  isDerivative: boolean,
  shared: OwnerContext,
  footnotes: Record<string, string>,
  lineIndex: number,
): ParsedOwnershipRow {
  const postBlock = extractBlocks(block, "postTransactionAmounts")[0] ?? block;
  const natureBlock = extractBlocks(block, "ownershipNature")[0] ?? block;
  const footnoteIds = [...new Set(extractFootnoteIds(block))];

  return {
    lineIndex,
    ...shared,
    securityTitle: extractValue(block, "securityTitle") ?? "Unknown security",
    isDerivative,
    transactionCode: null,
    transactionDate: null,
    sharesAmount: null,
    acquiredOrDisposed: null,
    pricePerShare: null,
    sharesOwnedFollowing: parseNumber(
      extractValue(postBlock, "sharesOwnedFollowingTransaction"),
    ),
    ownershipForm: extractValue(natureBlock, "directOrIndirectOwnership"),
    natureOfIndirectOwnership: extractValue(natureBlock, "natureOfOwnership"),
    footnoteIds,
    footnoteRawText: resolveFootnoteText(footnoteIds, footnotes),
  };
}

/**
 * Parse SEC ownership XML (Forms 3/4/5).
 * Element names confirmed against live filings — see rulebook/CHANGELOG.md.
 */
export function parseOwnershipXml(xml: string): ParsedOwnershipFiling {
  const parseWarnings: ParsedOwnershipFiling["parseWarnings"] = [];
  const footnotes = parseFootnotes(xml);
  const owner = parseReportingOwner(xml);

  const issuerBlock = extractBlocks(xml, "issuer")[0] ?? xml;
  const issuerCik = extractValue(issuerBlock, "issuerCik") ?? "";
  const issuerName = extractValue(issuerBlock, "issuerName");
  const ticker = extractValue(issuerBlock, "issuerTradingSymbol");
  const formType = extractValue(xml, "documentType") ?? "4";
  const periodOfReport = extractValue(xml, "periodOfReport");
  const is10b51Checkbox = parseBooleanFlag(extractValue(xml, "aff10b5One"));

  if (!issuerCik) {
    parseWarnings.push({
      elementPath: "issuer/issuerCik",
      message: "Missing issuer CIK",
    });
  }

  const shared = {
    issuerCik,
    issuerName,
    ticker,
    reportingOwnerName: owner.reportingOwnerName,
    reportingOwnerCik: owner.reportingOwnerCik,
    isDirector: owner.isDirector,
    isOfficer: owner.isOfficer,
    isTenPctOwner: owner.isTenPctOwner,
    isOther: owner.isOther,
    officerTitle: owner.officerTitle,
    is10b51Checkbox,
  };

  const rows: ParsedOwnershipRow[] = [];
  let lineIndex = 0;

  const nonDerivativeTable = extractBlocks(xml, "nonDerivativeTable")[0];
  if (nonDerivativeTable) {
    for (const block of extractBlocks(nonDerivativeTable, "nonDerivativeTransaction")) {
      rows.push(parseTransactionBlock(block, false, shared, footnotes, lineIndex++));
    }
    for (const block of extractBlocks(nonDerivativeTable, "nonDerivativeHolding")) {
      rows.push(parseHoldingBlock(block, false, shared, footnotes, lineIndex++));
    }
  }

  const derivativeTable = extractBlocks(xml, "derivativeTable")[0];
  if (derivativeTable) {
    for (const block of extractBlocks(derivativeTable, "derivativeTransaction")) {
      rows.push(parseTransactionBlock(block, true, shared, footnotes, lineIndex++));
    }
  }

  if (!xml.includes("ownershipDocument")) {
    parseWarnings.push({
      elementPath: "ownershipDocument",
      message: "Root element ownershipDocument not found",
      rawFragment: xml.slice(0, 200),
    });
  }

  return {
    formType,
    periodOfReport,
    issuerCik,
    issuerName,
    ticker,
    reportingOwnerName: owner.reportingOwnerName,
    reportingOwnerCik: owner.reportingOwnerCik,
    isDirector: owner.isDirector,
    isOfficer: owner.isOfficer,
    isTenPctOwner: owner.isTenPctOwner,
    isOther: owner.isOther,
    officerTitle: owner.officerTitle,
    is10b51Checkbox,
    footnotes,
    rows,
    parseWarnings,
  };
}
