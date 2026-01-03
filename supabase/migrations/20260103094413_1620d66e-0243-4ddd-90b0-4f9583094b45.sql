-- Add UPDATE policy for member_attendance table
CREATE POLICY "Staff/admin can update member attendance" 
ON public.member_attendance 
FOR UPDATE 
USING (is_staff_or_admin());