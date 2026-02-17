-- ============================================================
-- BCH Service Management - Row Level Security Policies
-- Run AFTER 001_initial_schema.sql in Supabase SQL Editor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS POLICIES
-- ============================================================

-- Anyone can read active mechanics (needed for login screen avatar grid)
CREATE POLICY "public_read_active_mechanics" ON public.users
  FOR SELECT USING (
    role = 'mechanic' AND is_active = true
  );

-- Authenticated admin can read all users
CREATE POLICY "admin_read_all_users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can read their own record
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Only admin can insert/update/delete users
CREATE POLICY "admin_manage_users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- JOBS POLICIES
-- ============================================================

-- Admin can do everything with jobs
CREATE POLICY "admin_full_jobs" ON public.jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Staff can read all jobs
CREATE POLICY "staff_read_all_jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'staff'
    )
  );

-- Staff can create jobs (check-in)
CREATE POLICY "staff_create_jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'staff'
    )
  );

-- Staff can update jobs (QC, payment processing)
CREATE POLICY "staff_update_jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'staff'
    )
  );

-- Mechanics can read jobs assigned to them
CREATE POLICY "mechanic_read_own_jobs" ON public.jobs
  FOR SELECT USING (
    mechanic_id IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

-- Senior mechanics can read all jobs (view-only per requirements)
CREATE POLICY "senior_mechanic_read_all" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'mechanic'
        AND u.mechanic_level = 'senior'
    )
  );

-- Mechanics can update their own assigned jobs (start, complete, parts)
CREATE POLICY "mechanic_update_own_jobs" ON public.jobs
  FOR UPDATE USING (
    mechanic_id IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- CUSTOMERS POLICIES
-- ============================================================

-- Staff and admin can read all customers
CREATE POLICY "staff_admin_read_customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'staff')
    )
  );

-- Staff and admin can create customers
CREATE POLICY "staff_admin_create_customers" ON public.customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'staff')
    )
  );

-- Only admin can update/delete customers
CREATE POLICY "admin_manage_customers" ON public.customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- PARTS POLICIES
-- ============================================================

-- Staff and admin can read parts
CREATE POLICY "staff_admin_read_parts" ON public.parts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'staff')
    )
  );

-- Mechanics can read parts (for adding to jobs)
CREATE POLICY "mechanic_read_parts" ON public.parts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'mechanic'
    )
  );

-- Only admin/staff can update parts stock
CREATE POLICY "staff_admin_update_parts" ON public.parts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'staff')
    )
  );

-- ============================================================
-- ACTIVITY LOGS POLICIES
-- ============================================================

-- Admin can read all logs
CREATE POLICY "admin_read_all_logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Any authenticated user can insert logs
CREATE POLICY "authenticated_insert_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
