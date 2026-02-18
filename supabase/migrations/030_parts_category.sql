-- ============================================================
-- BCH Service Management - Add category to service_options
-- ============================================================
-- Parts can be categorized as 'electric' or 'non_electric'
-- to allow filtering in the UI.
-- Services have no category (NULL).
-- ============================================================

ALTER TABLE public.service_options
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- ============================================================
-- Update CREATE RPC to accept category
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_create_service_option(
  p_caller_id UUID,
  p_type TEXT,
  p_name TEXT,
  p_price NUMERIC DEFAULT 0,
  p_category TEXT DEFAULT NULL
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

  INSERT INTO public.service_options (type, name, price, category, sort_order)
  VALUES (p_type, p_name, COALESCE(p_price, 0), p_category, max_order + 1)
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Update UPDATE RPC to accept category
-- ============================================================
CREATE OR REPLACE FUNCTION public.app_update_service_option(
  p_caller_id UUID,
  p_id UUID,
  p_name TEXT,
  p_price NUMERIC DEFAULT NULL,
  p_category TEXT DEFAULT NULL
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

  UPDATE public.service_options
  SET name = p_name,
      price = COALESCE(p_price, price),
      category = p_category
  WHERE id = p_id AND is_active = true
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
