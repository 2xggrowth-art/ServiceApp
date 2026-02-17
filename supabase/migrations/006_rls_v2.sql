-- ============================================================
-- BCH Service Management - RLS v2: Clean Redesign with Owner Role
-- Run AFTER all previous migrations in Supabase SQL Editor
-- ============================================================
-- Changes:
--   1. Add 'owner' to users role constraint
--   2. Update helper functions to support owner role
--   3. Drop ALL existing policies and recreate from scratch
--   4. Owner gets same privileges as admin everywhere
--   5. Mechanics can read parts (for ActiveJob parts modal)
--   6. Staff can manage jobs (check-in, QC, payment)
-- ============================================================

-- ============================================================
-- STEP 1: Update role constraint to include 'owner'
-- ============================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'admin', 'mechanic', 'staff'));

-- ============================================================
-- STEP 2: Update helper functions
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

-- Helper: check if current user is owner or admin
CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- STEP 3: Drop ALL existing policies (clean slate)
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
-- STEP 4: Recreate USERS policies
-- ============================================================

-- Anyone can read active mechanics (login screen avatar grid — no auth needed)
CREATE POLICY "users_read_active_mechanics" ON public.users
  FOR SELECT USING (
    role = 'mechanic' AND is_active = true
  );

-- Users can read their own record
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Owner/Admin can read all users
CREATE POLICY "users_owner_admin_read_all" ON public.users
  FOR SELECT USING (public.is_owner_or_admin());

-- Owner/Admin can manage (insert/update/delete) users
CREATE POLICY "users_owner_admin_manage" ON public.users
  FOR ALL USING (public.is_owner_or_admin());

-- Staff can read all active users (needed for assignment display)
CREATE POLICY "users_staff_read_active" ON public.users
  FOR SELECT USING (
    public.get_my_role() = 'staff' AND is_active = true
  );

-- ============================================================
-- STEP 5: Recreate JOBS policies
-- ============================================================

-- Owner/Admin full access to jobs
CREATE POLICY "jobs_owner_admin_full" ON public.jobs
  FOR ALL USING (public.is_owner_or_admin());

-- Staff can read all jobs
CREATE POLICY "jobs_staff_read" ON public.jobs
  FOR SELECT USING (public.get_my_role() = 'staff');

-- Staff can create jobs (check-in flow)
CREATE POLICY "jobs_staff_insert" ON public.jobs
  FOR INSERT WITH CHECK (public.get_my_role() = 'staff');

-- Staff can update jobs (QC pass/fail, payment processing)
CREATE POLICY "jobs_staff_update" ON public.jobs
  FOR UPDATE USING (public.get_my_role() = 'staff');

-- Mechanics can read their own assigned jobs
CREATE POLICY "jobs_mechanic_read_own" ON public.jobs
  FOR SELECT USING (mechanic_id = public.get_my_user_id());

-- Senior mechanics can read all jobs (view-only per requirements)
CREATE POLICY "jobs_senior_mechanic_read_all" ON public.jobs
  FOR SELECT USING (
    public.get_my_role() = 'mechanic'
    AND public.get_my_mechanic_level() = 'senior'
  );

-- Mechanics can update their own assigned jobs (start, complete, add parts)
CREATE POLICY "jobs_mechanic_update_own" ON public.jobs
  FOR UPDATE USING (mechanic_id = public.get_my_user_id());

-- ============================================================
-- STEP 6: Recreate CUSTOMERS policies
-- ============================================================

-- Owner/Admin/Staff can read all customers
CREATE POLICY "customers_read" ON public.customers
  FOR SELECT USING (public.get_my_role() IN ('owner', 'admin', 'staff'));

-- Owner/Admin/Staff can create customers (during check-in)
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (public.get_my_role() IN ('owner', 'admin', 'staff'));

-- Owner/Admin can update customers
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (public.is_owner_or_admin());

-- Owner/Admin can delete customers
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (public.is_owner_or_admin());

-- ============================================================
-- STEP 7: Recreate PARTS policies
-- ============================================================

-- Everyone authenticated can read parts (mechanics need this for parts modal)
CREATE POLICY "parts_read" ON public.parts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Owner/Admin/Staff can manage parts stock
CREATE POLICY "parts_insert" ON public.parts
  FOR INSERT WITH CHECK (public.get_my_role() IN ('owner', 'admin', 'staff'));

CREATE POLICY "parts_update" ON public.parts
  FOR UPDATE USING (public.get_my_role() IN ('owner', 'admin', 'staff'));

CREATE POLICY "parts_delete" ON public.parts
  FOR DELETE USING (public.is_owner_or_admin());

-- ============================================================
-- STEP 8: Recreate ACTIVITY LOGS policies
-- ============================================================

-- Owner/Admin can read all logs
CREATE POLICY "logs_owner_admin_read" ON public.activity_logs
  FOR SELECT USING (public.is_owner_or_admin());

-- Any authenticated user can insert logs
CREATE POLICY "logs_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
