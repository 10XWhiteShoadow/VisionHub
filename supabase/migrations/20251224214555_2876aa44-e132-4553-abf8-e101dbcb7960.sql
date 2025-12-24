-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view attendance records"
ON public.attendance_records FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert attendance records"
ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance records"
ON public.attendance_records FOR DELETE TO authenticated
USING (true);

-- Create index for faster queries by date
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);

-- Create unique constraint to prevent duplicate entries per student per day
CREATE UNIQUE INDEX idx_attendance_records_student_date 
ON public.attendance_records(student_id, date);