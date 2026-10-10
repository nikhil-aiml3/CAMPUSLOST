/*
# Storage bucket policies for lost-found-images

1. Security
- Create policies on the `lost-found-images` storage bucket for public read and write.
- This is a single-tenant no-auth app, so all uploads and reads are intentionally public.
*/

DROP POLICY IF EXISTS "Public read for lost-found-images" ON storage.objects;
CREATE POLICY "Public read for lost-found-images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'lost-found-images');

DROP POLICY IF EXISTS "Public upload for lost-found-images" ON storage.objects;
CREATE POLICY "Public upload for lost-found-images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'lost-found-images');