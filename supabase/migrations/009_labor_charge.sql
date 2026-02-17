-- ============================================================
-- BCH Service Management - Add labor_charge column
-- Run AFTER 008_performance_rpcs.sql in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS labor_charge NUMERIC;
