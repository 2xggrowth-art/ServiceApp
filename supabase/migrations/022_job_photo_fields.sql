-- ============================================================
-- BCH Service Management - Photo/Audio URL fields in job updates
-- ============================================================
-- Adds photo_before and photo_after to app_update_job RPC
-- and app_create_job RPC so media URLs can be saved on the job record.
-- ============================================================

-- Update app_create_job to accept photo_before and photo_after
CREATE OR REPLACE FUNCTION public.app_create_job(
  p_caller_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_bike TEXT,
  p_service_type TEXT,
  p_issue TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'standard',
  p_estimated_min INT DEFAULT NULL,
  p_bike_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_labor_charge NUMERIC DEFAULT NULL,
  p_services JSONB DEFAULT '[]'::JSONB,
  p_checkin_parts JSONB DEFAULT '[]'::JSONB,
  p_photo_before TEXT DEFAULT NULL,
  p_photo_after TEXT DEFAULT NULL
)
RETURNS SETOF public.jobs AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('staff', 'admin', 'owner', 'mechanic') THEN
    RAISE EXCEPTION 'Unauthorized: role % cannot create jobs', COALESCE(caller_role, 'unknown');
  END IF;

  RETURN QUERY
  INSERT INTO public.jobs (
    customer_name, customer_phone, bike, service_type,
    issue, priority, status, estimated_min, date, time_block,
    bike_id, customer_id, labor_charge, created_by,
    services, checkin_parts, photo_before, photo_after
  ) VALUES (
    p_customer_name, p_customer_phone, p_bike, p_service_type,
    p_issue, p_priority, 'received', p_estimated_min, CURRENT_DATE,
    CASE WHEN EXTRACT(HOUR FROM now()) < 13 THEN 'morning' ELSE 'afternoon' END,
    p_bike_id, p_customer_id, p_labor_charge, p_caller_id,
    p_services, p_checkin_parts, p_photo_before, p_photo_after
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update app_update_job to handle photo_before and photo_after
CREATE OR REPLACE FUNCTION public.app_update_job(
  p_caller_id UUID,
  p_job_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.jobs AS $$
DECLARE
  caller_role TEXT;
  job_mechanic UUID;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  -- Mechanics can update their own jobs OR pick unassigned jobs
  IF caller_role = 'mechanic' THEN
    SELECT mechanic_id INTO job_mechanic FROM public.jobs WHERE id = p_job_id;
    IF job_mechanic IS NOT NULL AND job_mechanic IS DISTINCT FROM p_caller_id THEN
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
