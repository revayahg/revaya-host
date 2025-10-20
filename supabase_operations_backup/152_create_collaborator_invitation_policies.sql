-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "collaborator_accept" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_role_insert" ON event_user_roles;
DROP POLICY IF EXISTS "collaborator_accept_invitation" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_create_role" ON event_user_roles;
DROP POLICY IF EXISTS "collaborator_read_own_role" ON event_user_roles;
DROP POLICY IF EXISTS "read_pending_invitations" ON event_collaborator_invitations;

-- Temporarily disable RLS to clear any issues
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Simple, permissive policy for reading invitations by token
CREATE POLICY "read_invitations_by_token"
  ON event_collaborator_invitations
  FOR SELECT
  TO authenticated
  USING (true);

-- Simple policy for updating invitations to accepted
CREATE POLICY "accept_any_invitation"
  ON event_collaborator_invitations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simple policy for creating user roles
CREATE POLICY "create_user_roles"
  ON event_user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Simple policy for reading user roles
CREATE POLICY "read_user_roles"
  ON event_user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON event_collaborator_invitations TO authenticated;
GRANT SELECT, INSERT ON event_user_roles TO authenticated;
