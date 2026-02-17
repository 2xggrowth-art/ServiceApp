-- ============================================================
-- Allow audio uploads in job-photos bucket
-- Fixes: audio file upload failing because allowed_mime_types
-- only had image types, and file_size_limit was too small for audio
-- ============================================================

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'
  ],
  file_size_limit = 10485760  -- 10MB (audio files can be larger than photos)
WHERE id = 'job-photos';
