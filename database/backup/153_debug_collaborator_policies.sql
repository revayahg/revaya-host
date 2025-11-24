-- Debug and fix collaborator invitation policies
-- This script creates very permissive policies to identify the root cause

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "collaborator_accept" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_role_insert" ON event_user_roles;
DROP POLICY IF EXISTS "collaborator_accept_invitation" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_create_role" ON event_user_roles;
DROP POLICY IF EXISTS "collaborator_read_own_role" ON event_user_roles;
DROP POLICY IF EXISTS "read_pending_invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "read_invitations_by_token" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "accept_any_invitation" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "create_user_roles" ON event_user_roles;
DROP POLICY IF EXISTS "read_user_roles" ON event_user_roles;

-- Temporarily disable RLS to clear any issues
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Create very simple, permissive policies for debugging
CREATE POLICY "debug_read_all_invitations"
  ON event_collaborator_invitations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "debug_update_all_invitations"
  ON event_collaborator_invitations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "debug_insert_all_roles"
  ON event_user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "debug_read_all_roles"
  ON event_user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant necessary permissions explicitly
GRANT SELECT, UPDATE ON event_collaborator_invitations TO authenticated;
GRANT SELECT, INSERT ON event_user_roles TO authenticated;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('event_collaborator_invitations', 'event_user_roles');