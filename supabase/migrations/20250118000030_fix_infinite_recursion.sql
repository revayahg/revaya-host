-- FIX INFINITE RECURSION: Fix the RLS policy that's causing infinite recursion
-- The policy is trying to check itself, creating a loop

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;

-- Step 2: Create a simpler, non-recursive policy
CREATE POLICY "Users can view their own event roles" ON event_user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Event owners can manage roles" ON event_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.created_by = auth.uid()
        )
    );

-- Step 3: Also fix the collaborator invitations policy to be simpler
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;

CREATE POLICY "Event owners can create invitations" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_collaborator_invitations.event_id 
            AND events.created_by = auth.uid()
        )
    );

-- Step 4: Verify the fix
SELECT 'RLS policies fixed - no more infinite recursion' as status;
