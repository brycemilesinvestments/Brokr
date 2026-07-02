# Document Analysis Workflows

This document describes how Brokr ingests, analyzes, and surfaces SEC filings through the **form-8k** and **form-10k** agents. Both pipelines share storage, embedding, and database primitives but differ in what they extract and which models they call.

---

## Overview

| Pipeline | Forms | Agent role | Primary AI use |
|----------|-------|------------|----------------|
| **form-8k** | 8-K | Event classifier | LLM confirms item codes / event type from prose |
| **form-10k** | 10-K | Structured extractor, differ, trust anchor | LLM prose diff on changed MD&A / risk sections only |

Neither pipeline is a generic “document classifier.” The 8-K agent labels material events. The 10-K agent extracts iXBRL, chunks by section, diffs year-over-year, and anchors audited data for chat.

---

## Model configuration (`.env.local`)

All analysis and embedding models are **hard-coded in `.env.local`** for local safety:

```bash
CLAUDE_ANALYSIS_MODEL=claude-haiku-4-5   # 8-K classification, prose diff, qualitative signals
VOYAGE_EMBEDDING_MODEL=voyage-finance-2  # RAG chunk embeddings (1024-dim)
# VOYAGE_API_KEY=                        # Optional; falls back to local hash embed if unset
MAX_COST_USD=0.10                        # Per-run AI budget cap (orchestration layers)
MAX_ITERATIONS=15                        # Router iteration guard (10-K agent)
```

| Variable | Used by | Default if unset |
|----------|---------|------------------|
| `CLAUDE_API_KEY` | All Claude calls | AI steps skipped or refused |
| `CLAUDE_ANALYSIS_MODEL` | `createAiClient()` | `claude-haiku-4-5` |
| `VOYAGE_EMBEDDING_MODEL` | `createEmbeddingClient()` | `voyage-finance-2` |
| `VOYAGE_API_KEY` | Voyage embeddings | Local deterministic embed |

**Embedding dimensions:** `1024` (`EMBEDDING_DIMENSIONS` in `src/lib/rag/constants.ts`), matching `voyage-finance-2`.

---

## When analysis runs (UI triggers)

### Documents tab — bulk sync (primary trigger)

**Route:** `/company/[cik]` → **Documents** tab

When the Documents tab becomes active (`enabled={activeTab === "documents"}`), two hooks fire in parallel:

1. `useForm8kSync` → `POST /api/company/[cik]/form-8k/sync`
2. `useForm10kSync` → `POST /api/company/[cik]/form-10k/sync`

Each hook runs **once per tab visit** (React `useEffect` on `enabled`). Status banners show progress, counts, and per-accession errors. Users can retry failed syncs independently.

**Files:**
- `src/routes/company/[cik]/features/filings/views/documents-view/documents-view.tsx`
- `src/routes/company/[cik]/hooks/use-form-8k-sync.ts`
- `src/routes/company/[cik]/hooks/use-form-10k-sync.ts`

### Single-filing analyze (on-demand)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/company/[cik]/form-8k/[accession]/analyze` | Re-run one 8-K |
| `POST /api/company/[cik]/form-10k/[accession]/analyze` | Re-run one 10-K |

These call the same orchestrators with `{ accessionNumber }` filter.

### Timeline tab — display only (no sync)

**Route:** `/company/[cik]` → **Timeline** tab

The timeline **does not** trigger ingestion. It reads filings already present in the company submissions payload and renders:

- Stock price chart with filing markers (`DocumentTimelineChart`)
- Chronological or fiscal-year grouped list (`FilingsTimeline` → `TimelineEntry`)

10-K and 8-K appear with form-type badges from `CORE_FORM_META`. Analysis results are **not** shown inline on timeline entries today; they live in `company_document_analyses` and pgvector for chat / filing detail.

**Files:**
- `src/routes/company/[cik]/features/filings/views/timeline-view/filings-timeline/`

### Filing detail — discovery & diff (separate from sync)

`/company/[cik]/filing/[accession]` runs **filing-discovery** (D1–D5) and **filing-diff** (F1–F7) on demand via API, not via the Documents tab sync.

---

## Shared pipeline primitives

Both form-8k and form-10k orchestrators share:

| Step | Module | Cost |
|------|--------|------|
| Fetch HTML from SEC | `createEdgarClient` | Free |
| Store in Supabase Storage (`edgar` bucket) | `fetch-and-store` | Free |
| Upsert filing metadata | `company_documents` | Free |
| HTML → plain text (8-K) / iXBRL parse (10-K) | `html-to-text` / `extractIxbrl` | Free |
| Section chunking | `chunkSections` (I1) | Free |
| Embed + pgvector store | `embedAndStore` (I2) | Voyage API (or local) |
| Ingest status | `filing_ingest_status` | Free |

---

## Form-8K workflow

### Code layout

```
src/lib/agent/form-8k/          # Classifier (types, prompts, classify.ts)
src/lib/orchestrate/form-8k/    # fetch-and-store, ingest-document, run.ts
src/app/api/company/[cik]/form-8k/
```

### Per-filing steps

1. **fetchAndStore8k** — Download primary 8-K HTML + optional EX-99.1; upload to `documents/8-K/{companyId}/8-K {MM-DD-YY}.htm`
2. **ingest8kDocument** — `htmlToPlainText` → prose sections (`form_8k_body`, `exhibit_99_1`) → `chunkSections` → `embedAndStore`
3. **classifyForm8k** — Two-pass:
   - **Pass 1 (free):** SEC item metadata from submissions
   - **Pass 2 (AI):** Claude confirms event type from document excerpt (`CLAUDE_ANALYSIS_MODEL`)
4. **upsertDocumentAnalysis** — `analysis_type = 'form_8k_classification'`

### Database storage

| Table | Content |
|-------|---------|
| `company_documents` | Filing metadata, `file_path`, `form_type`, accession |
| `company_document_analyses` | `result` JSON: `primaryEventType`, `declaredItems`, `confidence`, `evidence` |
| `filing_chunks` | Embedded prose chunks (`section_type`: `form_8k_body` / `exhibit_99_1`) |
| `filing_ingest_status` | `chunks_done`, `embedded_done` flags |

### Idempotency

- If `company_documents` row exists → skip SEC download, load from storage
- If `company_document_analyses` exists → skip classification ($0)
- If chunks exist for accession → skip re-embed (`embedAndStore` duplicate guard)

---

## Form-10K workflow

### Code layout

```
src/lib/agent/form-10k/         # Router + completion contract (K1–K12)
src/lib/orchestrate/form-10k/   # ingest-sections, analyze-filing, run.ts
src/app/api/company/[cik]/form-10k/
```

### Per-filing steps

1. **fetchAndStore10k** — Download primary 10-K HTML; upload to `documents/10-K/{companyId}/10-K {MM-DD-YY}.htm`
2. **ingest10kSections (K1)** — `locateForm10kSections` from iXBRL → nine section types → `chunkSections` with `audited: true` → `embedAndStore`
3. **runForm10kAgent (K2–K12)** — Deterministic router; AI only on prose diff cache miss:

| Key | Action | AI? |
|-----|--------|-----|
| K1 | Section-aware ingest | No |
| K2 | Full XBRL universe vs companyfacts | No |
| K3 | `audited: true` on all 10-K points | No |
| K4 | Pair with prior-year 10-K | No |
| K5 | Numeric metric diff | No |
| K6 | Structural diff (sections, risk tags) | No |
| K7 | Check prose diff cache | No |
| K8 | Prose diff (MD&A + risk factors, changed only) | **Yes** (cached) |
| K9 | Store MD&A outlook for credibility tracking | No |
| K10 | Cross-ref 8-K events from prior classifications | No |
| K11 | Auditor name change detection | No |
| K12 | Confirm pgvector schema (`section_type`, `audited`) | No |

4. **upsertDocumentAnalysis** — `analysis_type = 'form_10k_analysis'`

### Section types (K1)

`business`, `risk_factors`, `mda`, `financials`, `notes`, `auditor`, `controls`, `legal`, `subsequent_events`

Each chunk stored as:

```ts
{ company_id, accession, section_type, period_end, text, audited: true, embedding }
```

### Database storage

Same tables as 8-K, plus:

- `filing_chunks.audited` — `true` for 10-K chunks; `false` for 8-K / 10-Q
- `structured_metrics.audited` — propagated from filing form on index
- `company_document_analyses.result` — full `Form10kOutput` JSON (pair, diffs, credibility, 8-K cross-refs, auditor change)

### 8-K cross-reference (K10)

During 10-K sync, known 8-K events are loaded from `company_document_analyses` where `analysis_type = 'form_8k_classification'`. Each event is searched against 10-K section prose. Unlinked events are flagged as potentially missing from the annual report.

**Ordering implication:** Run 8-K sync before 10-K sync (Documents tab runs both in parallel; on first visit 10-K cross-ref may be empty until 8-K completes).

---

## Audited flag (K3)

| Source form | `audited` |
|-------------|-----------|
| 10-K, 20-F, 40-F | `true` |
| 10-Q, 8-K, other | `false` |

Applied to:
- `RawTimeSeriesPoint` / `MetricSeriesPoint` in `buildMetricSeriesBundle`
- `FilingChunk` at ingest
- `structured_metrics` on upsert

Chat retrieval can filter `match_filing_chunks(..., match_audited := true)` for numeric-trust questions.

---

## pgvector / RAG

| Component | Path |
|-----------|------|
| Chunking | `src/lib/rag/ingest/chunk-sections.ts` |
| Embedding client | `src/lib/rag/embed/client.ts` |
| Store | `src/lib/rag/store/chunk-store.ts` |
| Vector search RPC | `match_filing_chunks` (Supabase) |
| Dimensions | 1024 (`voyage-finance-2`) |

**Chunk sizing:** `MIN_CHUNK_CHARS=1500`, `MAX_CHUNK_CHARS=3200`, split on paragraph/sentence boundaries.

---

## Reset / re-run

```bash
npx tsx scripts/reset-8k-pipeline.ts   # Clears 8-K embeddings + analyses
```

For a full fresh run: truncate `filing_chunks`, clear `company_document_analyses`, re-open Documents tab.

---

## API response shapes

### 8-K sync

```json
{
  "processedCount": 3,
  "processed": [{
    "accessionNumber": "...",
    "skippedStore": true,
    "chunksStored": 12,
    "classification": { "primaryEventType": "earnings", "confidence": "high" },
    "costUsd": 0.002
  }]
}
```

### 10-K sync

```json
{
  "processedCount": 1,
  "processed": [{
    "accessionNumber": "...",
    "skippedStore": false,
    "chunksStored": 84,
    "analysis": { "auditorChange": { "changed": false }, "xbrlUniverse": { "ixbrlExceedsCompanyfacts": true } },
    "costUsd": 0.008
  }]
}
```

---

## Related modules (not Documents-tab sync)

| Module | Trigger | Role |
|--------|---------|------|
| `filing-discovery` | Filing detail API | Per-filing concept universe, forward signals |
| `filing-diff` | Filing detail diff panel | YoY numeric + structural + prose diff |
| `buildMetricSeriesBundle` | Company analysis | SEC companyfacts time series |
| RAG chat | Chat UI | `vectorSearch` + grounded answer |

---

## File index

| Concern | Path |
|---------|------|
| 8-K agent | `src/lib/agent/form-8k/` |
| 10-K agent | `src/lib/agent/form-10k/` |
| 8-K orchestrate | `src/lib/orchestrate/form-8k/` |
| 10-K orchestrate | `src/lib/orchestrate/form-10k/` |
| Supabase documents | `src/lib/supabase/company-documents.ts` |
| Migrations | `supabase/migrations/20260701024634_form_8k_pipeline.sql`, `20260702140000_form_10k_audited_column.sql` |
| Env models | `.env.local` |
