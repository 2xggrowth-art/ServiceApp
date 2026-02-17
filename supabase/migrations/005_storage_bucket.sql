-- ============================================================
-- BCH Service Management - Storage Bucket for Job Photos
-- Run in Supabase SQL Editor
-- ============================================================

-- Create the storage bucket for job photos (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "authenticated_upload_photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.uid() IS NOT NULL
  );

-- Allow public read access to photos
CREATE POLICY "public_read_photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'job-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "authenticated_update_photos" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'job-photos'
    AND auth.uid() IS NOT NULL
  );
