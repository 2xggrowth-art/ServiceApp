-- ============================================================
-- Migration 028: Add hash_pin RPC
--
-- Without this function, creating/updating mechanics via the
-- Team page stores pin_hash as NULL, making PIN login impossible.
-- ============================================================

CREATE OR REPLACE FUNCTION public.hash_pin(p_pin TEXT)
RETURNS TEXT AS $$
  SELECT crypt(p_pin, gen_salt('bf'));
$$ LANGUAGE sql SECURITY DEFINER;
