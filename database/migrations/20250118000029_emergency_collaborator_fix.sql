-- EMERGENCY FIX: Completely recreate collaborator tables with correct schema
-- This will fix all 500 errors by ensuring the database matches development exactly

-- Step 1: Drop all existing policies and constraints
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;

DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

-- Step 2: Drop all constraints
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_collaborator_invitations DROP CONSTRAINT IF EXISTS event_collaborator_invitations_permission_level_check;
ALTER TABLE event_collaborator_invitations DROP CONSTRAINT IF EXISTS event_collaborator_invitations_status_check;

-- Step 3: Completely recreate event_collaborator_invitations table
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

-- Step 4: Fix event_user_roles table constraint
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check 
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 5: Update any existing 'admin' roles to 'owner' for event creators
UPDATE event_user_roles 
SET role = 'owner' 
WHERE role = 'admin' 
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 6: Ensure all event creators have 'owner' role in event_user_roles
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

-- Step 7: Re-enable RLS and create policies for event_collaborator_invitations
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations they sent or received" ON event_collaborator_invitations
    FOR SELECT USING (
        invited_by = auth.uid() OR 
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Event admins can create invitations" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_id = event_collaborator_invitations.event_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update their own invitations" ON event_collaborator_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        invited_by = auth.uid()
    );

-- Step 8: Re-enable RLS and create policies for event_user_roles
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event roles" ON event_user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Event owners/admins can manage roles" ON event_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_user_roles eur_owner
            WHERE eur_owner.event_id = event_user_roles.event_id
            AND eur_owner.user_id = auth.uid()
            AND eur_owner.role IN ('owner', 'admin')
        )
    );

-- Step 9: Verify the fix
SELECT 'Current roles in event_user_roles:' as info, role, COUNT(*) as count 
FROM event_user_roles 
GROUP BY role
ORDER BY role;

SELECT 'event_collaborator_invitations table created successfully' as status;
