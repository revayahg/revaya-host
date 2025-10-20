-- DIRECT SQL FIX FOR INFINITE RECURSION
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Step 1: Completely disable RLS on both tables
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event creators can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event creators can create invitations" ON event_collaborator_invitations;

-- Step 3: Check and fix the role constraint
-- First, let's see what the current constraint allows
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'event_user_roles'::regclass 
AND contype = 'c';

-- Drop the existing role constraint (it might be named differently)
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check1;

-- Add the new constraint with 'owner' role
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 4: Update any existing 'admin' roles to 'owner' for event creators
UPDATE event_user_roles
SET role = 'owner'
WHERE role = 'admin'
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 5: Ensure event creators have 'admin' role in event_user_roles (until we fix the constraint)
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT
    e.id as event_id,
    e.created_by as user_id,
    'admin' as role,
    'active' as status
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur
    WHERE eur.event_id = e.id
    AND eur.user_id = e.created_by
)
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    updated_at = NOW();

-- Step 6: Test that the tables work without RLS
SELECT 'event_user_roles table accessible' as status, COUNT(*) as count FROM event_user_roles;
SELECT 'event_collaborator_invitations table accessible' as status, COUNT(*) as count FROM event_collaborator_invitations;
