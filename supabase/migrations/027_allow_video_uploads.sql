-- Allow video uploads in job-photos bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'
],
file_size_limit = 52428800  -- 50MB for video files
WHERE id = 'job-photos';
