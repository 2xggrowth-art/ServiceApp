-- ============================================================
-- BCH Service Management - Link Supabase Auth Users
-- ============================================================
-- PREREQUISITE: Create these two auth users FIRST in the
-- Supabase Dashboard (Authentication > Users > Add User):
--
--   1. Email: bch@gmail.com     Password: bch@123     (Owner)
--   2. Email: admin@gmail.com   Password: admin@123   (Admin)
--
-- Then run this migration to link them to public.users records.
-- ============================================================

-- Link Owner (bch@gmail.com)
UPDATE public.users
SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'bch@gmail.com' LIMIT 1
)
WHERE email = 'bch@gmail.com'
  AND auth_user_id IS NULL;

-- Link Admin (admin@gmail.com)
UPDATE public.users
SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@gmail.com' LIMIT 1
)
WHERE email = 'admin@gmail.com'
  AND auth_user_id IS NULL;
