-- ============================================================
-- BCH Service Management - Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable pgcrypto for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'mechanic', 'staff')),
  mechanic_level TEXT CHECK (mechanic_level IN ('senior', 'junior')),
  pin_hash TEXT,
  avatar TEXT,
  color TEXT DEFAULT '#6b7280',
  status TEXT DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'off_duty', 'on_leave')),
  is_active BOOLEAN DEFAULT true,
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active) WHERE is_active = true;

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  visits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- ============================================================
-- JOBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  bike TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('regular', 'repair', 'makeover', 'insurance')),
  issue TEXT,
  priority TEXT DEFAULT 'standard' CHECK (priority IN ('standard', 'urgent')),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'assigned', 'in_progress', 'parts_pending', 'quality_check', 'ready', 'completed')),
  mechanic_id UUID REFERENCES public.users(id),
  estimated_min INT,
  actual_min INT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_block TEXT CHECK (time_block IN ('morning', 'afternoon')),
  parts_used JSONB DEFAULT '[]'::jsonb,
  parts_needed JSONB DEFAULT '[]'::jsonb,
  total_cost NUMERIC(10, 2),
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'credit')),
  qc_status TEXT CHECK (qc_status IN ('passed', 'failed')),
  photo_before TEXT,
  photo_after TEXT,
  created_by UUID REFERENCES public.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_date ON public.jobs(date);
CREATE INDEX IF NOT EXISTS idx_jobs_mechanic ON public.jobs(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_date_status ON public.jobs(date, status);

-- ============================================================
-- PARTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  stock INT DEFAULT 0,
  price NUMERIC(10, 2) NOT NULL,
  reorder_at INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ACTIVITY LOGS TABLE (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_job ON public.activity_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- PIN VERIFICATION RPC (Server-side, SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_pin(p_phone TEXT, p_pin TEXT)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  user_mechanic_level TEXT,
  user_avatar TEXT,
  user_color TEXT,
  user_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.role,
    u.mechanic_level,
    u.avatar,
    u.color,
    u.status
  FROM public.users u
  WHERE u.phone = p_phone
    AND u.pin_hash = crypt(p_pin, u.pin_hash)
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET ACTIVE MECHANICS (for login screen avatar grid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_mechanics()
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_avatar TEXT,
  user_color TEXT,
  user_mechanic_level TEXT,
  user_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.phone,
    u.avatar,
    u.color,
    u.mechanic_level,
    u.status
  FROM public.users u
  WHERE u.role = 'mechanic'
    AND u.is_active = true
  ORDER BY u.mechanic_level DESC, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
