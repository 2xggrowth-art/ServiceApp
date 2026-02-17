-- ============================================================
-- BCH Service Management - Performance Tracking RPCs
-- Run AFTER 007_schema_hardening.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. get_mechanic_stats — Individual mechanic performance
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mechanic_stats(
  p_mechanic_id UUID,
  p_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_jobs BIGINT,
  completed_jobs BIGINT,
  avg_completion_min NUMERIC,
  on_time_pct NUMERIC,
  total_revenue NUMERIC,
  parts_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_jobs,
    COUNT(*) FILTER (WHERE j.status = 'completed')::BIGINT AS completed_jobs,
    ROUND(AVG(j.actual_min) FILTER (WHERE j.actual_min IS NOT NULL), 1) AS avg_completion_min,
    CASE
      WHEN COUNT(*) FILTER (WHERE j.actual_min IS NOT NULL AND j.estimated_min IS NOT NULL) = 0 THEN 0
      ELSE ROUND(
        100.0 * COUNT(*) FILTER (WHERE j.actual_min <= j.estimated_min)
        / NULLIF(COUNT(*) FILTER (WHERE j.actual_min IS NOT NULL AND j.estimated_min IS NOT NULL), 0),
        1
      )
    END AS on_time_pct,
    COALESCE(SUM(j.total_cost) FILTER (WHERE j.status = 'completed'), 0) AS total_revenue,
    COALESCE(
      SUM(
        (SELECT COALESCE(SUM((elem->>'price')::NUMERIC * COALESCE((elem->>'qty')::INT, 1)), 0)
         FROM jsonb_array_elements(j.parts_used) AS elem)
      ) FILTER (WHERE j.status = 'completed'),
      0
    ) AS parts_cost
  FROM public.jobs j
  WHERE j.mechanic_id = p_mechanic_id
    AND j.date BETWEEN p_from AND p_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. get_mechanic_daily_stats — Daily breakdown for charts
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mechanic_daily_stats(
  p_mechanic_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE(
  stat_date DATE,
  jobs_completed BIGINT,
  avg_min NUMERIC,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.date AS stat_date,
    COUNT(*) FILTER (WHERE j.status = 'completed')::BIGINT AS jobs_completed,
    ROUND(AVG(j.actual_min) FILTER (WHERE j.actual_min IS NOT NULL), 1) AS avg_min,
    COALESCE(SUM(j.total_cost) FILTER (WHERE j.status = 'completed'), 0) AS revenue
  FROM public.jobs j
  WHERE j.mechanic_id = p_mechanic_id
    AND j.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY j.date
  ORDER BY j.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 3. get_team_leaderboard — Ranked team stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_team_leaderboard(
  p_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  mechanic_id UUID,
  mechanic_name TEXT,
  mechanic_avatar TEXT,
  mechanic_color TEXT,
  jobs_completed BIGINT,
  avg_min NUMERIC,
  on_time_pct NUMERIC,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS mechanic_id,
    u.name AS mechanic_name,
    u.avatar AS mechanic_avatar,
    u.color AS mechanic_color,
    COUNT(j.id) FILTER (WHERE j.status = 'completed')::BIGINT AS jobs_completed,
    ROUND(AVG(j.actual_min) FILTER (WHERE j.actual_min IS NOT NULL), 1) AS avg_min,
    CASE
      WHEN COUNT(j.id) FILTER (WHERE j.actual_min IS NOT NULL AND j.estimated_min IS NOT NULL) = 0 THEN 0
      ELSE ROUND(
        100.0 * COUNT(j.id) FILTER (WHERE j.actual_min <= j.estimated_min)
        / NULLIF(COUNT(j.id) FILTER (WHERE j.actual_min IS NOT NULL AND j.estimated_min IS NOT NULL), 0),
        1
      )
    END AS on_time_pct,
    COALESCE(SUM(j.total_cost) FILTER (WHERE j.status = 'completed'), 0) AS revenue
  FROM public.users u
  LEFT JOIN public.jobs j ON j.mechanic_id = u.id AND j.date BETWEEN p_from AND p_to
  WHERE u.role = 'mechanic' AND u.is_active = true
  GROUP BY u.id, u.name, u.avatar, u.color
  ORDER BY jobs_completed DESC, avg_min ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. get_slow_jobs — Jobs exceeding estimated time
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_slow_jobs(
  p_threshold_multiplier NUMERIC DEFAULT 1.5
)
RETURNS TABLE(
  job_id UUID,
  customer_name TEXT,
  bike TEXT,
  service_type TEXT,
  mechanic_name TEXT,
  estimated_min INT,
  actual_min INT,
  overtime_pct NUMERIC,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id AS job_id,
    j.customer_name,
    j.bike,
    j.service_type,
    u.name AS mechanic_name,
    j.estimated_min,
    j.actual_min,
    ROUND(100.0 * (j.actual_min - j.estimated_min) / NULLIF(j.estimated_min, 0), 1) AS overtime_pct,
    j.completed_at
  FROM public.jobs j
  LEFT JOIN public.users u ON u.id = j.mechanic_id
  WHERE j.actual_min IS NOT NULL
    AND j.estimated_min IS NOT NULL
    AND j.actual_min > j.estimated_min * p_threshold_multiplier
    AND j.date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY overtime_pct DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
