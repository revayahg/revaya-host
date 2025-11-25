-- Ensure get_invitation_by_token RPC function exists and is properly exposed
-- Date: 2025-11-24

-- Drop the function if it exists to ensure clean recreation
DROP FUNCTION IF EXISTS public.get_invitation_by_token(TEXT);

-- Recreate the function with correct return type
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

-- Ensure permissions are set for both authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon;

-- Grant usage on schema (needed for RPC calls)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Verify the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_invitation_by_token'
  ) THEN
    RAISE EXCEPTION 'Function get_invitation_by_token was not created successfully';
  END IF;
END $$;

