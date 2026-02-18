-- ============================================================
-- BCH Service Management - Give staff access to service options
-- ============================================================
-- Staff can now create, update, delete, and reorder service/part options.
-- ============================================================

-- CREATE
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
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner', 'staff') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner/staff can manage service options';
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

-- UPDATE
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
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner', 'staff') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner/staff can manage service options';
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

-- DELETE (soft)
CREATE OR REPLACE FUNCTION public.app_delete_service_option(
  p_caller_id UUID,
  p_id UUID
)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := public.get_user_role(p_caller_id);
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner', 'staff') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner/staff can manage service options';
  END IF;

  UPDATE public.service_options SET is_active = false WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REORDER (swap)
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
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'owner', 'staff') THEN
    RAISE EXCEPTION 'Unauthorized: only admin/owner/staff can manage service options';
  END IF;

  SELECT sort_order INTO order_a FROM public.service_options WHERE id = p_id_a;
  SELECT sort_order INTO order_b FROM public.service_options WHERE id = p_id_b;

  UPDATE public.service_options SET sort_order = order_b WHERE id = p_id_a;
  UPDATE public.service_options SET sort_order = order_a WHERE id = p_id_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
