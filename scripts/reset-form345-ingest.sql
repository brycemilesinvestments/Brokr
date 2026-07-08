-- Reset all Form 3/4/5 ingest data (run in Supabase SQL Editor)
--
-- Clears:
--   form345_transactions
--   form345_filings_processed
--   form345_parse_review_log
--   footnote_classifications (cached footnote labels from ingest)
--
-- After running, revisit the Insider page to re-sync filings from EDGAR.

begin;

-- Optional: inspect current row counts before wiping
select 'form345_transactions' as table_name, count(*) as row_count from public.form345_transactions
union all
select 'form345_filings_processed', count(*) from public.form345_filings_processed
union all
select 'form345_parse_review_log', count(*) from public.form345_parse_review_log
union all
select 'footnote_classifications', count(*) from public.footnote_classifications;

-- Child tables first, then parents/cache.
-- RESTART IDENTITY resets bigint identity columns back to 1.
truncate table
  public.form345_transactions,
  public.form345_parse_review_log,
  public.form345_filings_processed,
  public.footnote_classifications
restart identity cascade;

-- Confirm everything is empty
select 'form345_transactions' as table_name, count(*) as row_count from public.form345_transactions
union all
select 'form345_filings_processed', count(*) from public.form345_filings_processed
union all
select 'form345_parse_review_log', count(*) from public.form345_parse_review_log
union all
select 'footnote_classifications', count(*) from public.footnote_classifications;

commit;
