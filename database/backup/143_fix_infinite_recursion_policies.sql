-- Fix infinite recursion in event_user_roles policies
-- This is causing 500 errors when fetching collaborators

-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view event collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners can manage collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Collaborators can view other collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Event participants can view collaborators" ON event_user_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Allow event owners to manage collaborators" ON event_user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_user_roles.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to view their own collaborator records" ON event_user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow authenticated users to view active collaborators" ON event_user_roles
FOR SELECT USING (
  status = 'active' 
  AND auth.uid() IS NOT NULL
);

-- Fix event_collaborator_invitations policies too
DROP POLICY IF EXISTS "Event owners can manage invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their events" ON event_collaborator_invitations;

CREATE POLICY "Allow event owners to manage collaborator invitations" ON event_collaborator_invitations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_collaborator_invitations.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to view invitations sent to them" ON event_collaborator_invitations
FOR SELECT USING (email = auth.email());

-- Ensure RLS is enabled
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;