# React Doctor false positives

Patterns listed here are skipped by `scripts/react-doctor-loop.sh` once wired into the filter step.
Add entries only after verifying the code shape in the file — never suppress on path alone.

## Candidates from full scan (2026-07-05)

- `react-doctor/iframe-missing-sandbox` — SEC filing iframes need `allow-scripts allow-same-origin` for embedded HTML; sandbox is present but the rule flags the combination.
- `react-doctor/label-has-associated-control` — `src/components/ui/label.tsx` is a Radix/shadcn primitive; consumers pass `htmlFor` at call sites.
- `deslop/unused-file` — shadcn/evilcharts scaffold files kept for future charts; confirm with `npm run check-usage` before deleting.
