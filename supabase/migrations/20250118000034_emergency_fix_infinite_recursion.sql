-- EMERGENCY FIX: Completely remove infinite recursion in RLS policies
-- This script will completely disable RLS temporarily and recreate all policies from scratch

-- Step 1: Completely disable RLS on event_user_roles to break the recursion
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on event_user_roles
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event creators can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

-- Step 3: Wait a moment to ensure all policies are cleared
SELECT pg_sleep(1);

-- Step 4: Re-enable RLS
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, non-recursive policies
-- Policy 1: Users can view their own roles (simple, no recursion)
CREATE POLICY "Users can view their own event roles" ON event_user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Event creators can manage roles (checks events table, not event_user_roles)
CREATE POLICY "Event creators can manage roles" ON event_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_user_roles.event_id
            AND created_by = auth.uid()
        )
    );

-- Step 6: Also fix event_collaborator_invitations table
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- Drop all policies on event_collaborator_invitations
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;

-- Re-enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Create simple policies for event_collaborator_invitations
CREATE POLICY "Users can view invitations they sent or received" ON event_collaborator_invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR 
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Event creators can create invitations" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_collaborator_invitations.event_id
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own invitations" ON event_collaborator_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        invited_by = auth.uid()
    );

-- Step 7: Ensure the role constraint is correct
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 8: Update any existing 'admin' roles to 'owner' for event creators
UPDATE event_user_roles
SET role = 'owner'
WHERE role = 'admin'
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 9: Ensure event creators have 'owner' role in event_user_roles
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT
    e.id as event_id,
    e.created_by as user_id,
    'owner' as role,
    'active' as status
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur
    WHERE eur.event_id = e.id
    AND eur.user_id = e.created_by
)
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = NOW();
