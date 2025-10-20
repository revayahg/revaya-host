-- Fix infinite recursion in RLS policies for event_user_roles and event_collaborator_invitations
-- This addresses circular policy references that cause "infinite recursion detected" errors

-- STEP 1: Disable RLS temporarily to clean up policies safely
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view event collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners can manage collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Collaborators can view other collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Event participants can view collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Allow event owners to manage collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Allow users to view their own collaborator records" ON event_user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to view active collaborators" ON event_user_roles;
DROP POLICY IF EXISTS "Users can view event roles they have access to" ON event_user_roles;
DROP POLICY IF EXISTS "Users can insert event roles for events they own" ON event_user_roles;
DROP POLICY IF EXISTS "Users can update event roles for events they own" ON event_user_roles;
DROP POLICY IF EXISTS "Users can delete event roles for events they own" ON event_user_roles;

-- Drop invitation policies
DROP POLICY IF EXISTS "Event owners can manage invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their events" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow event owners to manage collaborator invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow users to view invitations sent to them" ON event_collaborator_invitations;

-- STEP 3: Create simple, non-recursive policies for event_user_roles
CREATE POLICY "simple_event_user_roles_select" ON event_user_roles
    FOR SELECT USING (
        -- Direct check: user owns the event OR user is the role holder
        EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
        OR 
        user_id = auth.uid()
    );

CREATE POLICY "simple_event_user_roles_insert" ON event_user_roles
    FOR INSERT WITH CHECK (
        -- Only event owners can add roles
        EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
    );

CREATE POLICY "simple_event_user_roles_update" ON event_user_roles
    FOR UPDATE USING (
        -- Only event owners can update roles
        EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
    );

CREATE POLICY "simple_event_user_roles_delete" ON event_user_roles
    FOR DELETE USING (
        -- Only event owners can delete roles
        EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
    );

-- STEP 4: Create simple policies for event_collaborator_invitations
CREATE POLICY "simple_invitations_select" ON event_collaborator_invitations
    FOR SELECT USING (
        -- Event owner can see all invitations for their events
        EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid())
        OR
        -- User can see invitations sent to their email
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "simple_invitations_insert" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        -- Only event owners can send invitations
        EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid())
    );

CREATE POLICY "simple_invitations_update" ON event_collaborator_invitations
    FOR UPDATE USING (
        -- Event owners or invitees can update
        EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid())
        OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "simple_invitations_delete" ON event_collaborator_invitations
    FOR DELETE USING (
        -- Only event owners can delete invitations
        EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid())
    );

-- STEP 5: Re-enable RLS
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- STEP 6: Verify policies are created correctly
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('event_user_roles', 'event_collaborator_invitations')
ORDER BY tablename, policyname;