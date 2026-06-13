-- Storage policies for article-images bucket
-- Allow authenticated users to upload/update/delete images

CREATE POLICY "Admins can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'article-images' AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can update article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'article-images' AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can delete article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'article-images' AND auth.role() = 'authenticated'
);
