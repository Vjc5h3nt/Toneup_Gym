-- Create a table to store follow-up history
CREATE TABLE public.lead_follow_ups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    follow_up_date DATE NOT NULL,
    note TEXT,
    status_at_time TEXT NOT NULL,
    created_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Follow-ups visible to staff/admin" 
ON public.lead_follow_ups 
FOR SELECT 
USING (is_staff_or_admin());

CREATE POLICY "Staff/admin can insert follow-ups" 
ON public.lead_follow_ups 
FOR INSERT 
WITH CHECK (is_staff_or_admin());

-- Create index for faster queries
CREATE INDEX idx_lead_follow_ups_lead_id ON public.lead_follow_ups(lead_id);
CREATE INDEX idx_lead_follow_ups_created_at ON public.lead_follow_ups(created_at DESC);