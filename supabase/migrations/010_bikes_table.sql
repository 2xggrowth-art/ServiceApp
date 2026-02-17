-- ============================================================
-- BCH Service Management - Bikes Table + Job FK
-- Run AFTER 009_labor_charge.sql in Supabase SQL Editor
-- ============================================================

-- 1. Create bikes table
CREATE TABLE IF NOT EXISTS public.bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bike_model TEXT NOT NULL,
  registration_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bikes_customer ON public.bikes(customer_id);
CREATE INDEX IF NOT EXISTS idx_bikes_registration ON public.bikes(registration_number)
  WHERE registration_number IS NOT NULL;

-- 2. Add bike_id nullable FK to jobs (backward compat: bike TEXT stays)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS bike_id UUID REFERENCES public.bikes(id);
CREATE INDEX IF NOT EXISTS idx_jobs_bike_id ON public.jobs(bike_id) WHERE bike_id IS NOT NULL;

-- 3. Add customer_id FK to jobs (optional linking for future queries)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id) WHERE customer_id IS NOT NULL;

-- 4. Updated_at trigger for bikes
CREATE TRIGGER set_bikes_updated_at
  BEFORE UPDATE ON public.bikes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Enable RLS on bikes
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
