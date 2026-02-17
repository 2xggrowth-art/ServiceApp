-- ============================================================
-- BCH Service Management - Auto Assignment Engine
-- Replicates the client-side scoring algorithm in PL/pgSQL
-- Run AFTER 001_initial_schema.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_assign_job(p_job_id UUID)
RETURNS UUID AS $$
DECLARE
  v_job RECORD;
  v_mechanic RECORD;
  v_best_id UUID := NULL;
  v_best_score INT := -9999;
  v_active_count INT;
  v_total_hours NUMERIC;
  v_score INT;
  v_is_weekend BOOLEAN;
BEGIN
  -- Fetch the job
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Check if it's a weekend (0=Sunday, 6=Saturday)
  v_is_weekend := EXTRACT(DOW FROM v_job.date) IN (0, 6);

  -- Score each active mechanic
  FOR v_mechanic IN
    SELECT * FROM public.users
    WHERE role = 'mechanic'
      AND status = 'on_duty'
      AND is_active = true
  LOOP
    -- Count active jobs for this mechanic today
    SELECT COUNT(*) INTO v_active_count
    FROM public.jobs
    WHERE mechanic_id = v_mechanic.id
      AND date = v_job.date
      AND status IN ('assigned', 'in_progress');

    -- Sum estimated hours for active jobs
    SELECT COALESCE(SUM(estimated_min), 0) / 60.0 INTO v_total_hours
    FROM public.jobs
    WHERE mechanic_id = v_mechanic.id
      AND date = v_job.date
      AND status IN ('assigned', 'in_progress');

    -- Calculate score (mirrors client-side algorithm exactly)
    v_score := 100;
    v_score := v_score - (v_active_count * 20);
    v_score := v_score - (v_total_hours * 10)::INT;

    -- Skill match bonuses
    IF v_job.service_type = 'repair' AND v_mechanic.mechanic_level = 'senior' THEN
      v_score := v_score + 15;
    END IF;
    IF v_job.service_type = 'makeover' AND v_mechanic.mechanic_level = 'senior' THEN
      v_score := v_score + 10;
    END IF;

    -- Weekend overload penalty
    IF v_is_weekend AND v_active_count >= 4 THEN
      v_score := v_score - 50;
    END IF;

    -- Track the best score
    IF v_score > v_best_score THEN
      v_best_score := v_score;
      v_best_id := v_mechanic.id;
    END IF;
  END LOOP;

  -- Assign the job if a mechanic was found
  IF v_best_id IS NOT NULL THEN
    UPDATE public.jobs
    SET mechanic_id = v_best_id,
        status = 'assigned',
        updated_at = now()
    WHERE id = p_job_id;

    -- Log the assignment
    INSERT INTO public.activity_logs (job_id, action, details)
    VALUES (
      p_job_id,
      'auto_assignment',
      jsonb_build_object(
        'mechanic_id', v_best_id,
        'score', v_best_score,
        'active_jobs', (SELECT COUNT(*) FROM public.jobs WHERE mechanic_id = v_best_id AND date = v_job.date AND status IN ('assigned', 'in_progress'))
      )
    );
  END IF;

  RETURN v_best_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
