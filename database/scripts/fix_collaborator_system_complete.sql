-- COMPLETE FIX: Make production database match development exactly
-- This recreates the entire collaborator system to match development

-- Step 1: Drop and recreate event_collaborator_invitations table to match development
DROP TABLE IF EXISTS event_collaborator_invitations CASCADE;

CREATE TABLE event_collaborator_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('owner', 'admin', 'editor', 'viewer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_by_name TEXT,
    invitation_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    read_status BOOLEAN DEFAULT FALSE,
    UNIQUE(event_id, email)
);

-- Step 2: Fix event_user_roles table constraint
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check 
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 3: Update any existing 'admin' roles to 'owner' for event creators
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

-- Step 5: Create indexes for event_collaborator_invitations
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_token ON event_collaborator_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_email ON event_collaborator_invitations(email);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_event ON event_collaborator_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_read_status ON event_collaborator_invitations(read_status, email);

-- Step 6: Enable RLS on event_collaborator_invitations
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for event_collaborator_invitations
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

-- Step 8: Fix RLS policies for event_user_roles
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

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

-- Step 9: Verify the fix worked
SELECT 'event_user_roles roles:' as table_name, role, COUNT(*) as count 
FROM event_user_roles 
GROUP BY role
UNION ALL
SELECT 'event_collaborator_invitations permission_levels:' as table_name, permission_level, COUNT(*) as count 
FROM event_collaborator_invitations 
GROUP BY permission_level;
