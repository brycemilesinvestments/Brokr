# Form 3/4/5 Rulebook Changelog

## 2026-07-06 — Initial seed

Sources consulted:

| Resource | URL |
|----------|-----|
| SEC ownership transaction codes | https://www.sec.gov/edgar/searchedgar/ownershipformcodes.html |
| Form 4 general instructions (codes, 10b5-1 checkbox) | https://www.sec.gov/files/form4.pdf |
| Rule 10b5-1(c) checkbox adoption (Release No. 33-11138, Dec 14 2022; effective Feb 27 2023) | https://www.sec.gov/rules/final/2022/33-11138.pdf |

Schema inspection (Phase 2) confirmed raw ownership XML element names against live filings:

- Root: `ownershipDocument`
- Issuer: `issuerCik`, `issuerName`, `issuerTradingSymbol`
- Reporting owner: `rptOwnerCik`, `rptOwnerName`, `isDirector`, `isOfficer`, `isTenPercentOwner`, `isOther`, `officerTitle`
- Rule 10b5-1 checkbox: `aff10b5One` (values: `true`, `false`, `0`, `1`)
- Transactions: `nonDerivativeTransaction`, `derivativeTransaction`, `nonDerivativeHolding`
- Footnotes: `footnotes/footnote[@id]`, referenced via `footnoteId[@id]` in transaction blocks

Raw XML lives at the accession root (e.g. `form4.xml`), **not** the XSLT-rendered `xslF345X06/` path listed as `primaryDocument` in submissions.

Re-check sources when SEC amends ownership reporting rules (typically every few years; 10b5-1 checkbox added 2023).
