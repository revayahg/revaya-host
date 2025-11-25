-- Fix get_invitation_by_token RPC function
-- Remove accepted_by column reference since it doesn't exist in the table
-- Date: 2025-11-24

-- Drop the function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_invitation_by_token(TEXT);

-- Recreate the function with correct return type
CREATE FUNCTION public.get_invitation_by_token(token_param TEXT)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  email TEXT,
  permission_level TEXT,
  status TEXT,
  invitation_token TEXT,
  invited_by UUID,
  invited_by_name TEXT,
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eci.id,
    eci.event_id,
    eci.email,
    eci.permission_level,
    eci.status,
    eci.invitation_token,
    eci.invited_by,
    eci.invited_by_name,
    eci.created_at,
    eci.accepted_at
  FROM event_collaborator_invitations eci
  WHERE eci.invitation_token = token_param;
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon;

