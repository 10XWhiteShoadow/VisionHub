-- Make background-removal bucket private
UPDATE storage.buckets SET public = false WHERE id = 'background-removal';

-- Drop existing public policies
DROP POLICY IF EXISTS "Anyone can view background removal images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload background removal images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete background removal images" ON storage.objects;

-- Create authenticated-only storage policies
CREATE POLICY "Authenticated users can view background removal images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'background-removal');

CREATE POLICY "Authenticated users can upload background removal images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'background-removal');

CREATE POLICY "Authenticated users can delete background removal images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'background-removal');

-- Drop existing public table policies
DROP POLICY IF EXISTS "Anyone can view background removal history" ON public.background_removal_history;
DROP POLICY IF EXISTS "Anyone can insert background removal history" ON public.background_removal_history;
DROP POLICY IF EXISTS "Anyone can delete background removal history" ON public.background_removal_history;

-- Create authenticated-only table policies
CREATE POLICY "Authenticated users can view background removal history"
ON public.background_removal_history FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert background removal history"
ON public.background_removal_history FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete background removal history"
ON public.background_removal_history FOR DELETE TO authenticated
USING (true);