-- ============================================================
-- Migration 012: RLS policies for bikes table
-- Run AFTER 010_bikes_table.sql
-- ============================================================

-- Owner/admin: full access to all bikes
CREATE POLICY "bikes_owner_admin_full"
  ON public.bikes FOR ALL
  USING (public.is_owner_or_admin());

-- Staff: read all bikes (needed for check-in lookup)
CREATE POLICY "bikes_staff_read"
  ON public.bikes FOR SELECT
  USING (public.get_my_role() = 'staff');

-- Staff: insert new bikes (check-in flow for new bikes)
CREATE POLICY "bikes_staff_insert"
  ON public.bikes FOR INSERT
  WITH CHECK (public.get_my_role() = 'staff');

-- Mechanics: read bikes linked to their assigned jobs
CREATE POLICY "bikes_mechanic_read"
  ON public.bikes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.bike_id = bikes.id
        AND j.mechanic_id = public.get_my_user_id()
    )
  );
