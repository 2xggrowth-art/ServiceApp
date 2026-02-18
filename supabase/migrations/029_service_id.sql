-- ============================================================
-- BCH Service Management - Service ID for job tracking
-- ============================================================
-- Adds a human-readable service_id (BCH-YYYYMMDD-NNN) to every job.
-- Auto-generated on creation, searchable, synced to Google Sheets & WhatsApp.
-- ============================================================

-- 1. Add the column (nullable first for backfill)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS service_id TEXT;

-- 2. Backfill existing jobs
UPDATE public.jobs
SET service_id = 'BCH-' || TO_CHAR(date, 'YYYYMMDD') || '-' || LPAD(sub.rn::TEXT, 3, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY date ORDER BY created_at) AS rn
  FROM public.jobs
) sub
WHERE public.jobs.id = sub.id AND public.jobs.service_id IS NULL;

-- 3. Make NOT NULL + UNIQUE after backfill
ALTER TABLE public.jobs ALTER COLUMN service_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_service_id ON public.jobs(service_id);

-- 4. Trigger to auto-generate service_id on INSERT (covers direct inserts + any RPC)
CREATE OR REPLACE FUNCTION public.generate_service_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.service_id IS NULL OR NEW.service_id = '' THEN
    SELECT COALESCE(MAX(
      NULLIF(SPLIT_PART(service_id, '-', 3), '')::INT
    ), 0) + 1 INTO next_num
    FROM public.jobs
    WHERE date = NEW.date;

    NEW.service_id := 'BCH-' || TO_CHAR(NEW.date, 'YYYYMMDD') || '-' || LPAD(next_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_service_id ON public.jobs;
CREATE TRIGGER trg_generate_service_id
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_service_id();

-- 5. Search RPC — finds jobs by service_id, customer name, or phone
CREATE OR REPLACE FUNCTION public.app_search_jobs(
  p_caller_id UUID,
  p_query TEXT
)
RETURNS SETOF public.jobs AS $$
DECLARE
  caller_role TEXT;
  search_term TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  search_term := '%' || LOWER(TRIM(p_query)) || '%';

  RETURN QUERY
  SELECT * FROM public.jobs
  WHERE LOWER(service_id) LIKE search_term
     OR LOWER(customer_name) LIKE search_term
     OR customer_phone LIKE search_term
  ORDER BY created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
