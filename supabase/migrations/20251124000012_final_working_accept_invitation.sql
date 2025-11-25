-- FINAL WORKING VERSION: Accept invitation function
-- This is the definitive fix - no more loops
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop ALL existing versions to ensure clean state
DROP FUNCTION IF EXISTS public.accept_invitation_and_create_role(TEXT);
DROP FUNCTION IF EXISTS public.accept_invitation_and_create_role(TEXT, UUID);
DROP FUNCTION IF EXISTS public.accept_invitation_and_create_role(TEXT, TEXT);

-- Create the function - single parameter, uses auth.uid() internally
CREATE OR REPLACE FUNCTION public.accept_invitation_and_create_role(
  invitation_token_param TEXT
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
  current_user_id UUID;
  user_email TEXT;
BEGIN
  -- Get current user ID from auth context (always UUID)
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentication required'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Get user email (for validation)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = current_user_id;

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

  -- Verify email matches (security check) - use explicit TEXT comparison
  IF lower(trim(user_email)) != lower(trim(invitation_record.email)) THEN
    RETURN QUERY SELECT false, 'Email does not match invitation'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
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

  -- Check if role already exists (explicit UUID comparison)
  SELECT *
  INTO existing_role_record
  FROM event_user_roles
  WHERE event_id = invitation_record.event_id
    AND user_id = current_user_id::UUID;

  IF FOUND THEN
    -- Update existing role
    UPDATE event_user_roles
    SET role = role_name,
        status = 'active',
        updated_at = NOW()
    WHERE event_id = invitation_record.event_id::UUID
      AND user_id = current_user_id::UUID;
  ELSE
    -- Insert new role (bypasses RLS due to SECURITY DEFINER)
    INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
    VALUES (
      invitation_record.event_id::UUID,
      current_user_id::UUID,
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
  WHERE id = invitation_record.id::UUID;

  -- Return success
  RETURN QUERY SELECT 
    true,
    'Invitation accepted successfully'::TEXT,
    invitation_record.id,
    invitation_record.event_id,
    role_name;
END;
$$;

-- Grant execute permissions to both authenticated and anon
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_create_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_create_role(TEXT) TO anon;

-- Also grant usage on schema (required for RPC exposure)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

RESET lock_timeout;
RESET statement_timeout;

