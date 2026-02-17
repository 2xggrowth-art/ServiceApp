-- ============================================================
-- BCH Service Management - Backfill bikes from existing jobs
-- Run AFTER 010_bikes_table.sql
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. Link jobs to existing customers by phone
UPDATE public.jobs j
SET customer_id = c.id
FROM public.customers c
WHERE j.customer_phone = c.phone
  AND j.customer_id IS NULL;

-- 2. Create bike records from unique customer+bike combos
INSERT INTO public.bikes (customer_id, bike_model)
SELECT DISTINCT c.id, j.bike
FROM public.jobs j
JOIN public.customers c ON c.phone = j.customer_phone
WHERE j.customer_phone IS NOT NULL
  AND j.bike IS NOT NULL
  AND j.bike != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.bikes b
    WHERE b.customer_id = c.id AND b.bike_model = j.bike
  );

-- 3. Link jobs to bike records
UPDATE public.jobs j
SET bike_id = b.id
FROM public.customers c, public.bikes b
WHERE j.customer_phone = c.phone
  AND b.customer_id = c.id
  AND b.bike_model = j.bike
  AND j.bike_id IS NULL;
