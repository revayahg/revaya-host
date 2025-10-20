-- TEMPORARY FIX: Completely disable RLS on problematic tables
-- This will allow the application to work while we debug the policy issues

-- Step 1: Completely disable RLS on event_user_roles
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on event_user_roles
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event creators can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

-- Step 3: Completely disable RLS on event_collaborator_invitations
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies on event_collaborator_invitations
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event creators can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;

-- Step 5: Ensure the role constraint is correct
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 6: Update any existing 'admin' roles to 'owner' for event creators
UPDATE event_user_roles
SET role = 'owner'
WHERE role = 'admin'
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 7: Ensure event creators have 'owner' role in event_user_roles
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

-- Step 8: Add a comment to remind us to re-enable RLS later
COMMENT ON TABLE event_user_roles IS 'RLS temporarily disabled to fix infinite recursion - re-enable with proper policies later';
COMMENT ON TABLE event_collaborator_invitations IS 'RLS temporarily disabled to fix infinite recursion - re-enable with proper policies later';
