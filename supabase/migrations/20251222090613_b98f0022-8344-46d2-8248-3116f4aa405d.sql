-- Fix check_member_access function to require authentication
-- This prevents unauthorized enumeration of member data

CREATE OR REPLACE FUNCTION public.check_member_access(p_member_id uuid)
RETURNS TABLE(allowed boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member RECORD;
    v_active_membership RECORD;
BEGIN
    -- CRITICAL: Check authentication - only staff/admin can check member access
    IF NOT is_staff_or_admin() THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Authentication required'::TEXT;
        RETURN;
    END IF;

    -- Get member info
    SELECT * INTO v_member FROM public.members WHERE id = p_member_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Member not found'::TEXT;
        RETURN;
    END IF;
    
    IF NOT v_member.is_active THEN
        RETURN QUERY SELECT FALSE, 'Member account is inactive'::TEXT;
        RETURN;
    END IF;
    
    -- Check for active membership
    SELECT * INTO v_active_membership 
    FROM public.memberships 
    WHERE member_id = p_member_id 
      AND status = 'active' 
      AND start_date <= CURRENT_DATE 
      AND end_date >= CURRENT_DATE
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'No active membership'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, 'Access granted'::TEXT;
END;
$$;

-- Restrict function access - only authenticated users can call it
REVOKE EXECUTE ON FUNCTION public.check_member_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_member_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_member_access(uuid) TO authenticated;