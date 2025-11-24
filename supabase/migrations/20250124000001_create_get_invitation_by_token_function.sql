-- Create RPC function to get invitation by token
-- This bypasses RLS since the token itself is the authentication
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_param TEXT)
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
  accepted_at TIMESTAMPTZ,
  accepted_by UUID
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
    eci.accepted_at,
    eci.accepted_by
  FROM event_collaborator_invitations eci
  WHERE eci.invitation_token = token_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon;

