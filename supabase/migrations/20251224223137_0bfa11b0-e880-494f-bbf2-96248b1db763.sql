-- Add user_id column to students table to track ownership
ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to attendance_records table to track ownership
ALTER TABLE public.attendance_records ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to background_removal_history table to track ownership
ALTER TABLE public.background_removal_history ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing overly permissive policies on students
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;

-- Create owner-scoped policies for students
CREATE POLICY "Users can view their own students"
ON public.students FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own students"
ON public.students FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own students"
ON public.students FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own students"
ON public.students FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Drop existing overly permissive policies on attendance_records
DROP POLICY IF EXISTS "Authenticated users can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can delete attendance records" ON public.attendance_records;

-- Create owner-scoped policies for attendance_records
CREATE POLICY "Users can view their own attendance records"
ON public.attendance_records FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own attendance records"
ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own attendance records"
ON public.attendance_records FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Drop existing overly permissive policies on background_removal_history
DROP POLICY IF EXISTS "Authenticated users can view background removal history" ON public.background_removal_history;
DROP POLICY IF EXISTS "Authenticated users can insert background removal history" ON public.background_removal_history;
DROP POLICY IF EXISTS "Authenticated users can delete background removal history" ON public.background_removal_history;

-- Create owner-scoped policies for background_removal_history
CREATE POLICY "Users can view their own background removal history"
ON public.background_removal_history FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own background removal history"
ON public.background_removal_history FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own background removal history"
ON public.background_removal_history FOR DELETE TO authenticated
USING (user_id = auth.uid());