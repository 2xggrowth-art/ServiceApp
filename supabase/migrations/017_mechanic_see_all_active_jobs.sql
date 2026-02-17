-- ============================================================
-- BCH Service Management - Mechanics See All Active Jobs
-- ============================================================
-- Change: Mechanics can now see OTHER mechanics' active jobs
-- so they can take over when a mechanic goes on break.
-- Added: All assigned/in_progress/parts_pending jobs from other
-- mechanics are now visible (read-only until takeover).
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
    -- Mechanics see:
    -- 1. Unassigned jobs (received status) for today — available to pick
    -- 2. Their own assigned/active jobs (today + carryover)
    -- 3. OTHER mechanics' active jobs (for takeover when someone is on break)
    RETURN QUERY
    SELECT * FROM public.jobs
    WHERE (
      -- Unassigned jobs for today
      (status = 'received' AND mechanic_id IS NULL AND date = p_date)
      OR
      -- My assigned jobs (today + carryover)
      (mechanic_id = p_caller_id AND (date = p_date OR (date < p_date AND status != 'completed')))
      OR
      -- Other mechanics' active jobs (for takeover)
      (mechanic_id IS NOT NULL AND mechanic_id != p_caller_id
       AND status IN ('assigned', 'in_progress', 'parts_pending')
       AND (date = p_date OR date < p_date))
    )
    ORDER BY
      CASE WHEN status = 'received' AND mechanic_id IS NULL THEN 0 ELSE 1 END,
      created_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
