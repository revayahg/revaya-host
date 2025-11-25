-- CRITICAL FIX: Remove updated_at from event_collaborator_invitations UPDATE
-- The table does NOT have an updated_at column - only created_at and accepted_at
-- This was causing: column "updated_at" of relation "event_collaborator_invitations" does not exist
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop and recreate function WITHOUT updated_at reference
DROP FUNCTION IF EXISTS public.accept_invitation_and_create_role(TEXT);

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
  token_uuid UUID;
  v_event_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentication required'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Cast TEXT token parameter to UUID (invitation_token column is UUID type)
  BEGIN
    token_uuid := invitation_token_param::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN QUERY SELECT false, 'Invalid invitation token format'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
      RETURN;
  END;

  -- Get user email (for validation)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = current_user_id;

  -- Find the invitation by token - compare UUID to UUID
  SELECT 
    eci.id,
    eci.event_id,
    eci.email,
    eci.permission_level,
    eci.status
  INTO invitation_record
  FROM event_collaborator_invitations eci
  WHERE eci.invitation_token = token_uuid
    AND eci.status = 'pending'
  LIMIT 1;

  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or expired invitation'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Store values in variables to avoid ambiguity
  v_invitation_id := invitation_record.id;
  v_event_id := invitation_record.event_id;

  -- Verify email matches (security check)
  IF lower(trim(COALESCE(user_email, ''))) != lower(trim(COALESCE(invitation_record.email, ''))) THEN
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

  -- Check if role already exists
  SELECT *
  INTO existing_role_record
  FROM event_user_roles eur
  WHERE eur.event_id = v_event_id
    AND eur.user_id = current_user_id;

  IF FOUND THEN
    -- Update existing role (event_user_roles HAS updated_at column)
    UPDATE event_user_roles eur
    SET role = role_name,
        status = 'active',
        updated_at = NOW()
    WHERE eur.event_id = v_event_id
      AND eur.user_id = current_user_id;
  ELSE
    -- Insert new role (bypasses RLS due to SECURITY DEFINER)
    -- event_user_roles HAS updated_at column
    INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
    VALUES (
      v_event_id,
      current_user_id,
      role_name,
      'active',
      NOW(),
      NOW()
    );
  END IF;

  -- Update invitation status
  -- CRITICAL: event_collaborator_invitations does NOT have updated_at column!
  -- Only has: id, event_id, email, permission_level, status, invited_by, invited_by_name,
  --           invitation_token, created_at, accepted_at, expires_at, read_status
  UPDATE event_collaborator_invitations eci
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE eci.id = v_invitation_id;

  -- Return success - use variables to avoid ambiguity
  RETURN QUERY SELECT 
    true,
    'Invitation accepted successfully'::TEXT,
    v_invitation_id,
    v_event_id,
    role_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_create_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_create_role(TEXT) TO anon;

-- Grant schema usage (required for RPC exposure)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

RESET lock_timeout;
RESET statement_timeout;

