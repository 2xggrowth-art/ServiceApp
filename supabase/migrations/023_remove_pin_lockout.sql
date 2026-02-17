-- ============================================================
-- Remove PIN lockout from verify_pin
-- Simplifies login: no more brute-force lockout or account locking
-- ============================================================

-- Replace verify_pin without lockout logic
CREATE OR REPLACE FUNCTION public.verify_pin(p_phone TEXT, p_pin TEXT)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  user_mechanic_level TEXT,
  user_avatar TEXT,
  user_color TEXT,
  user_status TEXT
) AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Find the user by phone
  SELECT * INTO v_user
  FROM public.users u
  WHERE u.phone = p_phone AND u.is_active = true;

  -- No user found
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Verify PIN
  IF v_user.pin_hash = crypt(p_pin, v_user.pin_hash) THEN
    -- Success: update last login
    UPDATE public.users
    SET last_login_at = now()
    WHERE id = v_user.id;

    RETURN QUERY
    SELECT
      v_user.id,
      v_user.name,
      v_user.role,
      v_user.mechanic_level,
      v_user.avatar,
      v_user.color,
      v_user.status;
  END IF;

  -- Wrong PIN: return empty
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the unlock_user function (no longer needed)
DROP FUNCTION IF EXISTS public.unlock_user(UUID);
