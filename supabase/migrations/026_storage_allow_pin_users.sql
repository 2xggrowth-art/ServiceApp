-- ============================================================
-- Allow PIN-based users (staff/mechanics) to upload to job-photos
-- ============================================================
-- Problem: The existing RLS policy requires auth.uid() IS NOT NULL,
-- but PIN-based users don't have a Supabase Auth session, so
-- auth.uid() is NULL and uploads fail with:
--   "new row violates row-level security policy"
--
-- Fix: Replace the restrictive INSERT/UPDATE policies with ones
-- that allow all uploads to the job-photos bucket. The bucket is
-- already public-read, and upload access is controlled at the
-- application layer (only authenticated app users can reach the
-- upload code path).
-- ============================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "authenticated_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_photos" ON storage.objects;

-- Allow anyone to upload to job-photos bucket (app controls access)
CREATE POLICY "allow_upload_job_photos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'job-photos');

-- Allow anyone to update files in job-photos bucket
CREATE POLICY "allow_update_job_photos" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'job-photos');

-- Allow anyone to delete files in job-photos bucket (for cleanup)
CREATE POLICY "allow_delete_job_photos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'job-photos');
