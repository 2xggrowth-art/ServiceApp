-- ============================================================
-- BCH Service Management - Self-Pick Jobs (Remove Auto-Assignment)
-- ============================================================
-- Change: Mechanics now pick their own jobs instead of auto-assignment.
-- This migration updates app_get_jobs to return unassigned jobs
-- to ALL mechanics (not just seniors), so they can see and claim jobs.
-- ============================================================

-- Deprecate auto_assign_job (kept for backwards compatibility)
COMMENT ON FUNCTION public.auto_assign_job(p_job_id UUID) IS
  'DEPRECATED: Auto-assignment disabled. Jobs now use mechanic self-picking.';

-- ============================================================
-- Update app_get_jobs to show unassigned jobs to ALL mechanics
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_get_jobs(
  p_caller_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS SETOF public.jobs AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  IF caller_role IN ('admin', 'owner', 'staff') THEN
    -- Admin/owner/staff see all jobs for the date + carryover
    RETURN QUERY
    SELECT * FROM public.jobs
    WHERE date = p_date OR (date < p_date AND status != 'completed')
    ORDER BY created_at;
  ELSIF caller_role = 'mechanic' THEN
    -- All mechanics see:
    -- 1. Unassigned jobs (received status) for today — available to pick
    -- 2. Their own assigned/active jobs (today + carryover)
    RETURN QUERY
    SELECT * FROM public.jobs
    WHERE (
      -- Unassigned jobs for today
      (status = 'received' AND mechanic_id IS NULL AND date = p_date)
      OR
      -- My assigned jobs (today + carryover)
      (mechanic_id = p_caller_id AND (date = p_date OR (date < p_date AND status != 'completed')))
    )
    ORDER BY
      CASE WHEN status = 'received' AND mechanic_id IS NULL THEN 0 ELSE 1 END,
      created_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
