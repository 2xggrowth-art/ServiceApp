-- ============================================================
-- BCH Service Management - SECURITY DEFINER RPCs for PIN Users
-- ============================================================
-- Problem: PIN-based users (mechanics/staff) don't have Supabase
-- Auth sessions, so auth.uid() is NULL and all RLS policies fail.
--
-- Solution: SECURITY DEFINER RPCs that accept a caller_id,
-- verify the caller's role internally, and perform operations
-- bypassing RLS. This is safe because:
--   1. verify_pin already authenticates the user
--   2. Each RPC checks role permissions internally
--   3. SECURITY DEFINER runs as the function owner (postgres)
-- ============================================================

-- Helper: get role for a given user ID (not dependent on auth.uid())
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = p_user_id AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- JOBS RPCs
-- ============================================================

-- Create a job (staff, admin, owner, mechanic)
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
  p_labor_charge NUMERIC DEFAULT NULL
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
    bike_id, customer_id, labor_charge, created_by
  ) VALUES (
    p_customer_name, p_customer_phone, p_bike, p_service_type,
    p_issue, p_priority, 'received', p_estimated_min, CURRENT_DATE,
    CASE WHEN EXTRACT(HOUR FROM now()) < 13 THEN 'morning' ELSE 'afternoon' END,
    p_bike_id, p_customer_id, p_labor_charge, p_caller_id
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get jobs for a date (any authenticated user)
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
    -- Mechanics see their own jobs + seniors see all
    DECLARE
      mech_level TEXT;
    BEGIN
      SELECT mechanic_level INTO mech_level FROM public.users WHERE id = p_caller_id;
      IF mech_level = 'senior' THEN
        RETURN QUERY
        SELECT * FROM public.jobs
        WHERE date = p_date OR (date < p_date AND status != 'completed')
        ORDER BY created_at;
      ELSE
        RETURN QUERY
        SELECT * FROM public.jobs
        WHERE mechanic_id = p_caller_id
          AND (date = p_date OR (date < p_date AND status != 'completed'))
        ORDER BY created_at;
      END IF;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update job status (staff, admin, owner, or assigned mechanic)
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

  -- Mechanics can only update their own jobs
  IF caller_role = 'mechanic' THEN
    SELECT mechanic_id INTO job_mechanic FROM public.jobs WHERE id = p_job_id;
    IF job_mechanic IS DISTINCT FROM p_caller_id THEN
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
    paused_at = CASE WHEN p_updates ? 'paused_at' THEN (p_updates->>'paused_at')::TIMESTAMPTZ ELSE paused_at END
  WHERE id = p_job_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign job to mechanic (admin, owner)
CREATE OR REPLACE FUNCTION public.app_assign_job(
  p_caller_id UUID,
  p_job_id UUID,
  p_mechanic_id UUID
)
RETURNS SETOF public.jobs AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner can assign jobs';
  END IF;

  RETURN QUERY
  UPDATE public.jobs
  SET mechanic_id = p_mechanic_id, status = 'assigned'
  WHERE id = p_job_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CUSTOMERS RPCs
-- ============================================================

-- Search customers by phone (staff, admin, owner)
CREATE OR REPLACE FUNCTION public.app_search_customers(
  p_caller_id UUID,
  p_phone TEXT
)
RETURNS SETOF public.customers AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('staff', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: cannot search customers';
  END IF;

  RETURN QUERY
  SELECT * FROM public.customers
  WHERE phone ILIKE '%' || p_phone || '%'
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all customers (staff, admin, owner)
CREATE OR REPLACE FUNCTION public.app_get_customers(p_caller_id UUID)
RETURNS SETOF public.customers AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('staff', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: cannot view customers';
  END IF;

  RETURN QUERY
  SELECT * FROM public.customers ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert customer (staff, admin, owner)
CREATE OR REPLACE FUNCTION public.app_upsert_customer(
  p_caller_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_visits INT DEFAULT 1
)
RETURNS SETOF public.customers AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('staff', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: cannot manage customers';
  END IF;

  RETURN QUERY
  INSERT INTO public.customers (name, phone, visits)
  VALUES (p_name, p_phone, p_visits)
  ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    visits = public.customers.visits + 1
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- USERS/MECHANICS RPCs
-- ============================================================

-- Get active mechanics (anyone — needed for login screen)
-- Already exists: get_active_mechanics()

-- Get all mechanics (any logged-in user)
CREATE OR REPLACE FUNCTION public.app_get_mechanics(p_caller_id UUID)
RETURNS SETOF public.users AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  RETURN QUERY
  SELECT * FROM public.users
  WHERE role = 'mechanic' AND is_active = true
  ORDER BY mechanic_level DESC, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update mechanic status (self, admin, owner)
CREATE OR REPLACE FUNCTION public.app_update_user_status(
  p_caller_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS SETOF public.users AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  -- Users can update their own status, or admin/owner can update anyone
  IF p_caller_id != p_user_id AND caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: can only update own status';
  END IF;

  RETURN QUERY
  UPDATE public.users SET status = p_status
  WHERE id = p_user_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTS RPCs
-- ============================================================

-- Get all parts (any logged-in user)
CREATE OR REPLACE FUNCTION public.app_get_parts(p_caller_id UUID)
RETURNS SETOF public.parts AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user not found';
  END IF;

  RETURN QUERY
  SELECT * FROM public.parts ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update parts stock (staff, admin, owner)
CREATE OR REPLACE FUNCTION public.app_update_part_stock(
  p_caller_id UUID,
  p_part_id UUID,
  p_delta INT
)
RETURNS SETOF public.parts AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('staff', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: cannot manage parts';
  END IF;

  RETURN QUERY
  UPDATE public.parts
  SET stock = GREATEST(0, stock + p_delta)
  WHERE id = p_part_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ACTIVITY LOGS RPCs
-- ============================================================

-- Insert activity log (any logged-in user)
CREATE OR REPLACE FUNCTION public.app_log_activity(
  p_caller_id UUID,
  p_action TEXT,
  p_job_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL THEN
    RETURN; -- silently skip if user not found
  END IF;

  INSERT INTO public.activity_logs (action, job_id, user_id, details)
  VALUES (p_action, p_job_id, p_caller_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get activity logs (admin, owner)
CREATE OR REPLACE FUNCTION public.app_get_activity_logs(
  p_caller_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  job_id UUID,
  user_id UUID,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ,
  user_name TEXT,
  user_avatar TEXT,
  user_color TEXT,
  job_customer_name TEXT,
  job_bike TEXT,
  job_service_type TEXT
) AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: cannot view activity logs';
  END IF;

  RETURN QUERY
  SELECT
    al.id, al.job_id, al.user_id, al.action, al.details, al.created_at,
    u.name, u.avatar, u.color,
    j.customer_name, j.bike, j.service_type
  FROM public.activity_logs al
  LEFT JOIN public.users u ON u.id = al.user_id
  LEFT JOIN public.jobs j ON j.id = al.job_id
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BIKES RPCs
-- ============================================================

-- Get bikes for a customer (staff, admin, owner)
CREATE OR REPLACE FUNCTION public.app_get_customer_bikes(
  p_caller_id UUID,
  p_customer_id UUID
)
RETURNS SETOF public.bikes AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('staff', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: cannot view bikes';
  END IF;

  RETURN QUERY
  SELECT * FROM public.bikes
  WHERE customer_id = p_customer_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
