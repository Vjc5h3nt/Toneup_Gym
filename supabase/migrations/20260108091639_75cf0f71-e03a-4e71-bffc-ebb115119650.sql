-- Create a new daily_attendance table for cleaner date-wise attendance tracking
CREATE TABLE public.daily_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_marked' CHECK (status IN ('present', 'absent', 'not_marked')),
  marked_by UUID REFERENCES public.staff(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one attendance record per member per day
  UNIQUE(member_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Daily attendance visible to staff/admin" 
ON public.daily_attendance 
FOR SELECT 
USING (is_staff_or_admin());

CREATE POLICY "Staff/admin can insert daily attendance" 
ON public.daily_attendance 
FOR INSERT 
WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff/admin can update daily attendance" 
ON public.daily_attendance 
FOR UPDATE 
USING (is_staff_or_admin());

CREATE POLICY "Staff/admin can delete daily attendance" 
ON public.daily_attendance 
FOR DELETE 
USING (is_staff_or_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_attendance_updated_at
BEFORE UPDATE ON public.daily_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_daily_attendance_date ON public.daily_attendance(date);
CREATE INDEX idx_daily_attendance_member_date ON public.daily_attendance(member_id, date);