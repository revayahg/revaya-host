-- Create SECURITY DEFINER function to accept invitation and create role
-- This bypasses RLS policies and allows users to accept invitations based on token
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.accept_invitation_and_create_role(TEXT, UUID);

-- Create function that accepts invitation token and creates role
CREATE OR REPLACE FUNCTION public.accept_invitation_and_create_role(
  invitation_token_param TEXT,
  user_id_param UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  invitation_id UUID,
  event_id UUID,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  existing_role_record RECORD;
  role_name TEXT;
BEGIN
  -- Find the invitation by token
  SELECT *
  INTO invitation_record
  FROM event_collaborator_invitations
  WHERE invitation_token = invitation_token_param
    AND status = 'pending'
  LIMIT 1;

  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or expired invitation'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Map permission_level to role
  CASE invitation_record.permission_level
    WHEN 'viewer' THEN role_name := 'viewer';
    WHEN 'editor' THEN role_name := 'editor';
    WHEN 'admin' THEN role_name := 'admin';
    WHEN 'owner' THEN role_name := 'owner';
    ELSE role_name := 'viewer';
  END CASE;

  -- Check if role already exists
  SELECT *
  INTO existing_role_record
  FROM event_user_roles
  WHERE event_id = invitation_record.event_id
    AND user_id = user_id_param;

  IF FOUND THEN
    -- Update existing role
    UPDATE event_user_roles
    SET role = role_name,
        status = 'active',
        updated_at = NOW()
    WHERE event_id = invitation_record.event_id
      AND user_id = user_id_param;
  ELSE
    -- Insert new role
    INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
    VALUES (
      invitation_record.event_id,
      user_id_param,
      role_name,
      'active',
      NOW(),
      NOW()
    );
  END IF;

  -- Update invitation status
  UPDATE event_collaborator_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_record.id;

  -- Return success
  RETURN QUERY SELECT 
    true,
    'Invitation accepted successfully'::TEXT,
    invitation_record.id,
    invitation_record.event_id,
    role_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_create_role(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_create_role(TEXT, UUID) TO anon;

RESET lock_timeout;
RESET statement_timeout;

