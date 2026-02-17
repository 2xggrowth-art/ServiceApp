-- ============================================================
-- BCH Service Management - Schema Hardening
-- Run AFTER 006_rls_v2.sql in Supabase SQL Editor
-- ============================================================
-- Changes:
--   1. PIN lockout columns on users
--   2. Customer loyalty columns
--   3. Job completion/QC columns
--   4. New composite indexes for performance
--   5. Updated verify_pin with brute-force lockout
--   6. Admin unlock_user RPC
-- ============================================================

-- ============================================================
-- STEP 1: New columns on users (PIN lockout + last login)
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS failed_pin_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ============================================================
-- STEP 2: New columns on customers (loyalty tracking)
-- ============================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS last_visit_date DATE,
  ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;

-- ============================================================
-- STEP 3: New columns on jobs (completion tracking + QC)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS expected_completion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qc_notes TEXT;

-- ============================================================
-- STEP 4: New indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_mechanic_date
  ON public.jobs(mechanic_id, date);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON public.jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON public.activity_logs(action);

-- Partial index: only open jobs (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_jobs_open
  ON public.jobs(status, date)
  WHERE status NOT IN ('completed');

-- ============================================================
-- STEP 5: Updated verify_pin with lockout protection
-- ============================================================
-- Lockout after 5 failed attempts for 15 minutes
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
DECLARE
  v_user RECORD;
BEGIN
  -- Find the user by phone
  SELECT * INTO v_user
  FROM public.users u
  WHERE u.phone = p_phone AND u.is_active = true;

  -- No user found
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Check if account is locked
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > now() THEN
    RAISE EXCEPTION 'Account locked. Try again after %',
      to_char(v_user.locked_until, 'HH24:MI');
  END IF;

  -- Verify PIN
  IF v_user.pin_hash = crypt(p_pin, v_user.pin_hash) THEN
    -- Success: reset attempts, update last login
    UPDATE public.users
    SET failed_pin_attempts = 0,
        locked_until = NULL,
        last_login_at = now()
    WHERE id = v_user.id;

    RETURN QUERY
    SELECT
      v_user.id,
      v_user.name,
      v_user.role,
      v_user.mechanic_level,
      v_user.avatar,
      v_user.color,
      v_user.status;
  ELSE
    -- Failure: increment attempts
    UPDATE public.users
    SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
        locked_until = CASE
          WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5
          THEN now() + interval '15 minutes'
          ELSE locked_until
        END
    WHERE id = v_user.id;

    -- Return empty (wrong PIN)
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 6: Admin unlock user RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Only owner/admin should call this (enforced at app level + RLS)
  UPDATE public.users
  SET failed_pin_attempts = 0,
      locked_until = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
