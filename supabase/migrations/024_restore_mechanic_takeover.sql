-- ============================================================
-- Restore mechanic job takeover in app_update_job
-- ============================================================
-- Migration 022 overwrote app_update_job and lost the takeover
-- logic from migration 019. This restores it so mechanics can
-- reassign another mechanic's job to themselves.
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_update_job(
  p_caller_id UUID,
  p_job_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.jobs AS $$
DECLARE
  caller_role TEXT;
  job_mechanic UUID;
  new_mechanic UUID;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  -- Mechanics can update their own jobs, pick unassigned jobs,
  -- OR take over another mechanic's job (reassign to self)
  IF caller_role = 'mechanic' THEN
    SELECT mechanic_id INTO job_mechanic FROM public.jobs WHERE id = p_job_id;

    -- Check if this is a takeover (reassigning to self)
    new_mechanic := CASE WHEN p_updates ? 'mechanic_id'
      THEN (p_updates->>'mechanic_id')::UUID ELSE NULL END;

    IF job_mechanic IS NOT NULL
       AND job_mechanic IS DISTINCT FROM p_caller_id
       AND (new_mechanic IS NULL OR new_mechanic IS DISTINCT FROM p_caller_id) THEN
      -- Not a takeover — mechanic is trying to update someone else's job
      RAISE EXCEPTION 'Unauthorized: mechanic can only update own jobs';
    END IF;
  ELSIF caller_role NOT IN ('staff', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: role % cannot update jobs', caller_role;
  END IF;

  RETURN QUERY
  UPDATE public.jobs SET
    status = COALESCE((p_updates->>'status')::TEXT, status),
    mechanic_id = CASE WHEN p_updates ? 'mechanic_id' THEN (p_updates->>'mechanic_id')::UUID ELSE mechanic_id END,
    started_at = CASE WHEN p_updates ? 'started_at' THEN (p_updates->>'started_at')::TIMESTAMPTZ ELSE started_at END,
    completed_at = CASE WHEN p_updates ? 'completed_at' THEN (p_updates->>'completed_at')::TIMESTAMPTZ ELSE completed_at END,
    actual_min = CASE WHEN p_updates ? 'actual_min' THEN (p_updates->>'actual_min')::INT ELSE actual_min END,
    parts_used = CASE WHEN p_updates ? 'parts_used' THEN (p_updates->'parts_used') ELSE parts_used END,
    parts_needed = CASE WHEN p_updates ? 'parts_needed' THEN (p_updates->'parts_needed') ELSE parts_needed END,
    total_cost = CASE WHEN p_updates ? 'total_cost' THEN (p_updates->>'total_cost')::NUMERIC ELSE total_cost END,
    payment_method = CASE WHEN p_updates ? 'payment_method' THEN (p_updates->>'payment_method')::TEXT ELSE payment_method END,
    qc_status = CASE WHEN p_updates ? 'qc_status' THEN (p_updates->>'qc_status')::TEXT ELSE qc_status END,
    paid_at = CASE WHEN p_updates ? 'paid_at' THEN (p_updates->>'paid_at')::TIMESTAMPTZ ELSE paid_at END,
    paused_at = CASE WHEN p_updates ? 'paused_at' THEN (p_updates->>'paused_at')::TIMESTAMPTZ ELSE paused_at END,
    services = CASE WHEN p_updates ? 'services' THEN (p_updates->'services') ELSE services END,
    checkin_parts = CASE WHEN p_updates ? 'checkin_parts' THEN (p_updates->'checkin_parts') ELSE checkin_parts END,
    photo_before = CASE WHEN p_updates ? 'photo_before' THEN (p_updates->>'photo_before')::TEXT ELSE photo_before END,
    photo_after = CASE WHEN p_updates ? 'photo_after' THEN (p_updates->>'photo_after')::TEXT ELSE photo_after END
  WHERE id = p_job_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
