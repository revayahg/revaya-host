-- CRITICAL FIX: Make production database match development database exactly
-- This fixes the collaborator system roles to use ('owner', 'admin', 'editor', 'viewer')

-- Step 1: Fix event_user_roles table constraint
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check 
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 2: Fix event_collaborator_invitations table constraint  
ALTER TABLE event_collaborator_invitations DROP CONSTRAINT IF EXISTS event_collaborator_invitations_permission_level_check;
ALTER TABLE event_collaborator_invitations ADD CONSTRAINT event_collaborator_invitations_permission_level_check 
    CHECK (permission_level IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 3: Update any existing 'admin' roles to 'owner' for event creators
-- Event creators should have 'owner' role, not 'admin'
UPDATE event_user_roles 
SET role = 'owner' 
WHERE role = 'admin' 
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 4: Ensure event creators have 'owner' role in event_user_roles
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

-- Step 5: Fix RLS policies to use correct role names
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

-- Create correct RLS policies for event_user_roles
CREATE POLICY "event_user_roles_select_policy" ON event_user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        ) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
            AND status = 'active'
        )
    );

CREATE POLICY "event_user_roles_insert_policy" ON event_user_roles
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        ) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "event_user_roles_update_policy" ON event_user_roles
    FOR UPDATE USING (
        user_id = auth.uid() OR
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        ) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "event_user_roles_delete_policy" ON event_user_roles
    FOR DELETE USING (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        ) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- Step 6: Fix event_collaborator_invitations RLS policies
DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_select_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_insert_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_update_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_delete_policy" ON event_collaborator_invitations;

CREATE POLICY "collaborator_invitations_select_policy" ON event_collaborator_invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
            AND status = 'active'
        )
    );

CREATE POLICY "collaborator_invitations_insert_policy" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
        ) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "collaborator_invitations_update_policy" ON event_collaborator_invitations
    FOR UPDATE USING (
        invited_by = auth.uid() OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "collaborator_invitations_delete_policy" ON event_collaborator_invitations
    FOR DELETE USING (
        invited_by = auth.uid() OR
        event_id IN (
            SELECT event_id FROM event_user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- Step 7: Add read_status column if it doesn't exist
ALTER TABLE event_collaborator_invitations 
ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE;

-- Step 8: Create index for read_status
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_read_status 
ON event_collaborator_invitations(read_status, email);

-- Step 9: Update existing invitations to be marked as unread
UPDATE event_collaborator_invitations 
SET read_status = FALSE 
WHERE read_status IS NULL;

-- Step 10: Verify the fix worked
SELECT 'event_user_roles roles:' as table_name, role, COUNT(*) as count 
FROM event_user_roles 
GROUP BY role
UNION ALL
SELECT 'event_collaborator_invitations permission_levels:' as table_name, permission_level, COUNT(*) as count 
FROM event_collaborator_invitations 
GROUP BY permission_level;
