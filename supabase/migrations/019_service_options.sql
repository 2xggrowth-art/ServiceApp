-- ============================================================
-- BCH Service Management - Service & Parts Options Management
-- ============================================================
-- Admin/owner can manage service types and parts lists that
-- appear in the Check-In dropdowns. Items can be reordered.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('service', 'part')),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by type + active
CREATE INDEX IF NOT EXISTS idx_service_options_type
  ON public.service_options(type, sort_order)
  WHERE is_active = true;

-- RLS: allow read for all, write for admin/owner only
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active service options"
  ON public.service_options FOR SELECT
  USING (is_active = true);

-- ============================================================
-- RPC: Get all active service options (ordered)
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_get_service_options()
RETURNS SETOF public.service_options AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.service_options
  WHERE is_active = true
  ORDER BY type, sort_order, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Create a service option (admin/owner only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_create_service_option(
  p_caller_id UUID,
  p_type TEXT,
  p_name TEXT
)
RETURNS public.service_options AS $$
DECLARE
  caller_role TEXT;
  max_order INT;
  new_row public.service_options;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner can manage service options';
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) INTO max_order
  FROM public.service_options
  WHERE type = p_type AND is_active = true;

  INSERT INTO public.service_options (type, name, sort_order)
  VALUES (p_type, p_name, max_order + 1)
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Update a service option name (admin/owner only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_update_service_option(
  p_caller_id UUID,
  p_id UUID,
  p_name TEXT
)
RETURNS public.service_options AS $$
DECLARE
  caller_role TEXT;
  updated_row public.service_options;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner can manage service options';
  END IF;

  UPDATE public.service_options SET name = p_name
  WHERE id = p_id AND is_active = true
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Delete (soft) a service option (admin/owner only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_delete_service_option(
  p_caller_id UUID,
  p_id UUID
)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner can manage service options';
  END IF;

  UPDATE public.service_options SET is_active = false WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Swap sort_order of two items (admin/owner only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_swap_service_option_order(
  p_caller_id UUID,
  p_id_a UUID,
  p_id_b UUID
)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
  order_a INT;
  order_b INT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner can manage service options';
  END IF;

  SELECT sort_order INTO order_a FROM public.service_options WHERE id = p_id_a;
  SELECT sort_order INTO order_b FROM public.service_options WHERE id = p_id_b;

  UPDATE public.service_options SET sort_order = order_b WHERE id = p_id_a;
  UPDATE public.service_options SET sort_order = order_a WHERE id = p_id_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
