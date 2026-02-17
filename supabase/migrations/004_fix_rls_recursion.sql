-- ============================================================
-- BCH Service Management - Fix RLS Infinite Recursion
-- Run AFTER all previous migrations in Supabase SQL Editor
-- ============================================================
-- Problem: Policies on "users" table query the "users" table
-- to check role, causing infinite recursion (error 42P17).
-- Fix: Use a SECURITY DEFINER function that bypasses RLS.
-- ============================================================

-- ============================================================
-- STEP 1: Helper function to get current user's role
-- SECURITY DEFINER bypasses RLS, breaking the recursion loop
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_mechanic_level()
RETURNS TEXT AS $$
  SELECT mechanic_level FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- STEP 2: Drop ALL existing policies (clean slate)
-- ============================================================

-- Users policies
DROP POLICY IF EXISTS "public_read_active_mechanics" ON public.users;
DROP POLICY IF EXISTS "admin_read_all_users" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "admin_manage_users" ON public.users;

-- Jobs policies
DROP POLICY IF EXISTS "admin_full_jobs" ON public.jobs;
DROP POLICY IF EXISTS "staff_read_all_jobs" ON public.jobs;
DROP POLICY IF EXISTS "staff_create_jobs" ON public.jobs;
DROP POLICY IF EXISTS "staff_update_jobs" ON public.jobs;
DROP POLICY IF EXISTS "mechanic_read_own_jobs" ON public.jobs;
DROP POLICY IF EXISTS "senior_mechanic_read_all" ON public.jobs;
DROP POLICY IF EXISTS "mechanic_update_own_jobs" ON public.jobs;

-- Customers policies
DROP POLICY IF EXISTS "staff_admin_read_customers" ON public.customers;
DROP POLICY IF EXISTS "staff_admin_create_customers" ON public.customers;
DROP POLICY IF EXISTS "admin_manage_customers" ON public.customers;

-- Parts policies
DROP POLICY IF EXISTS "staff_admin_read_parts" ON public.parts;
DROP POLICY IF EXISTS "mechanic_read_parts" ON public.parts;
DROP POLICY IF EXISTS "staff_admin_update_parts" ON public.parts;

-- Activity logs policies
DROP POLICY IF EXISTS "admin_read_all_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "authenticated_insert_logs" ON public.activity_logs;

-- ============================================================
-- STEP 3: Recreate USERS policies (using helper functions)
-- ============================================================

-- Anyone can read active mechanics (login screen avatar grid — no auth needed)
CREATE POLICY "public_read_active_mechanics" ON public.users
  FOR SELECT USING (
    role = 'mechanic' AND is_active = true
  );

-- Users can read their own record
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Admin can read all users
CREATE POLICY "admin_read_all_users" ON public.users
  FOR SELECT USING (public.get_my_role() = 'admin');

-- Admin can insert/update/delete users
CREATE POLICY "admin_manage_users" ON public.users
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- STEP 4: Recreate JOBS policies (using helper functions)
-- ============================================================

-- Admin full access
CREATE POLICY "admin_full_jobs" ON public.jobs
  FOR ALL USING (public.get_my_role() = 'admin');

-- Staff can read all jobs
CREATE POLICY "staff_read_all_jobs" ON public.jobs
  FOR SELECT USING (public.get_my_role() = 'staff');

-- Staff can create jobs (check-in)
CREATE POLICY "staff_create_jobs" ON public.jobs
  FOR INSERT WITH CHECK (public.get_my_role() = 'staff');

-- Staff can update jobs (payment, QC)
CREATE POLICY "staff_update_jobs" ON public.jobs
  FOR UPDATE USING (public.get_my_role() = 'staff');

-- Mechanics can read their own assigned jobs
CREATE POLICY "mechanic_read_own_jobs" ON public.jobs
  FOR SELECT USING (mechanic_id = public.get_my_user_id());

-- Senior mechanics can read all jobs
CREATE POLICY "senior_mechanic_read_all" ON public.jobs
  FOR SELECT USING (
    public.get_my_role() = 'mechanic'
    AND public.get_my_mechanic_level() = 'senior'
  );

-- Mechanics can update their own assigned jobs
CREATE POLICY "mechanic_update_own_jobs" ON public.jobs
  FOR UPDATE USING (mechanic_id = public.get_my_user_id());

-- ============================================================
-- STEP 5: Recreate CUSTOMERS policies
-- ============================================================

CREATE POLICY "staff_admin_read_customers" ON public.customers
  FOR SELECT USING (public.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "staff_admin_create_customers" ON public.customers
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "admin_manage_customers" ON public.customers
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- ============================================================
-- STEP 6: Recreate PARTS policies
-- ============================================================

CREATE POLICY "staff_admin_read_parts" ON public.parts
  FOR SELECT USING (public.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "mechanic_read_parts" ON public.parts
  FOR SELECT USING (public.get_my_role() = 'mechanic');

CREATE POLICY "staff_admin_update_parts" ON public.parts
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'staff'));

-- ============================================================
-- STEP 7: Recreate ACTIVITY LOGS policies
-- ============================================================

CREATE POLICY "admin_read_all_logs" ON public.activity_logs
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "authenticated_insert_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
