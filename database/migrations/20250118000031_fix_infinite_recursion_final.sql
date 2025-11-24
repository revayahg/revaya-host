-- FINAL FIX: Completely remove infinite recursion in RLS policies
-- This script will drop ALL policies on event_user_roles and create simple, non-recursive ones

-- Step 1: Drop ALL existing policies on event_user_roles
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

-- Step 2: Disable RLS temporarily to allow policy recreation
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies
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
