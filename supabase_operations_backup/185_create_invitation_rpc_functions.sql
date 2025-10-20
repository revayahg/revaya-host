-- Create RPC functions to handle invitation access that bypasses RLS policies
-- This helps with 406 errors caused by overly restrictive policies

-- Function to get invitation by token (bypasses RLS)
CREATE OR REPLACE FUNCTION get_invitation_by_token(token TEXT)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  invitation_token TEXT,
  invited_by UUID,
  invited_by_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eci.id,
    eci.event_id,
    eci.email,
    eci.role,
    eci.status,
    eci.invitation_token,
    eci.invited_by,
    eci.invited_by_name,
    eci.expires_at,
    eci.created_at,
    eci.updated_at,
    eci.accepted_at,
    eci.accepted_by
  FROM event_collaborator_invitations eci
  WHERE eci.invitation_token = token
  LIMIT 1;
END;
$$;

-- Function to accept invitation by token (bypasses RLS)
CREATE OR REPLACE FUNCTION accept_invitation_by_token(
  token TEXT,
  user_id_param UUID,
  user_email TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  invitation_id UUID,
  event_id UUID,
  role TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  invitation_record RECORD;
  existing_role_record RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record
  FROM event_collaborator_invitations
  WHERE invitation_token = token
  AND status = 'pending'
  AND email = LOWER(user_email)
  LIMIT 1;
  
  IF invitation_record IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already processed'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if user already has a role for this event
  SELECT * INTO existing_role_record
  FROM event_user_roles
  WHERE event_id = invitation_record.event_id
  AND user_id = user_id_param
  LIMIT 1;
  
  -- Create or update user role
  IF existing_role_record IS NULL THEN
    INSERT INTO event_user_roles (event_id, user_id, role, status)
    VALUES (invitation_record.event_id, user_id_param, invitation_record.role, 'active');
  ELSE
    UPDATE event_user_roles 
    SET role = invitation_record.role, status = 'active', updated_at = NOW()
    WHERE event_id = invitation_record.event_id AND user_id = user_id_param;
  END IF;
  
  -- Update invitation status
  UPDATE event_collaborator_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = user_id_param,
    updated_at = NOW()
  WHERE invitation_token = token;
  
  RETURN QUERY SELECT 
    TRUE, 
    'Invitation accepted successfully'::TEXT, 
    invitation_record.id, 
    invitation_record.event_id, 
    invitation_record.role;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION accept_invitation_by_token(TEXT, UUID, TEXT) TO authenticated, anon;