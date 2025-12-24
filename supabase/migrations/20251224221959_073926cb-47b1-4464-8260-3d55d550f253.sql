-- Make student-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

-- Drop existing public SELECT policy
DROP POLICY IF EXISTS "Public can view student photos" ON storage.objects;

-- Create policy for authenticated users only
CREATE POLICY "Authenticated can view student photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-photos');

-- Add database constraints for input validation on students table
ALTER TABLE public.students 
ADD CONSTRAINT name_length CHECK (length(name) > 0 AND length(name) <= 100);

ALTER TABLE public.students 
ADD CONSTRAINT roll_no_length CHECK (length(roll_no) > 0 AND length(roll_no) <= 50);