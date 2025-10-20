-- COMPLETE POLICY RESET - Fix all recursion and permission issues
-- Step 1: Disable RLS temporarily to avoid recursion during cleanup
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies completely
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on event_user_roles
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'event_user_roles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON event_user_roles';
    END LOOP;
    
    -- Drop all policies on event_collaborator_invitations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'event_collaborator_invitations' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON event_collaborator_invitations';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE policies without recursion
-- Event User Roles - Only event owners can manage
CREATE POLICY "owner_only_select" ON event_user_roles
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
);

CREATE POLICY "owner_only_insert" ON event_user_roles
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
);

CREATE POLICY "owner_only_update" ON event_user_roles
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
);

CREATE POLICY "owner_only_delete" ON event_user_roles
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
);

-- Collaborator Invitations - Event owners and invited users
CREATE POLICY "invitation_access_select" ON event_collaborator_invitations
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid()) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "invitation_owner_insert" ON event_collaborator_invitations
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
);

CREATE POLICY "invitation_owner_update" ON event_collaborator_invitations
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid())
);

CREATE POLICY "invitation_owner_delete" ON event_collaborator_invitations
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid())
);

-- Step 5: Grant permissions to fix "permission denied for table users"
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Step 6: Create safe helper function
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_id UUID)
RETURNS TABLE(email TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        COALESCE(p.first_name || ' ' || p.last_name, u.email) as display_name
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_profile_safe(UUID) TO authenticated;

-- Step 7: Create the missing get_event_participants_simple function
CREATE OR REPLACE FUNCTION get_event_participants_simple(p_event_id UUID)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    role TEXT,
    display_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return event owner first
    RETURN QUERY
    SELECT 
        e.user_id,
        u.email,
        'admin'::TEXT as role,
        COALESCE(p.first_name || ' ' || p.last_name, u.email) as display_name,
        'active'::TEXT as status
    FROM events e
    JOIN auth.users u ON u.id = e.user_id
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = p_event_id;
    
    -- Return active collaborators
    RETURN QUERY
    SELECT 
        eur.user_id,
        u.email,
        eur.role,
        COALESCE(p.first_name || ' ' || p.last_name, u.email) as display_name,
        eur.status
    FROM event_user_roles eur
    JOIN auth.users u ON u.id = eur.user_id
    LEFT JOIN profiles p ON p.id = eur.user_id
    WHERE eur.event_id = p_event_id
    AND eur.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_participants_simple(UUID) TO authenticated;
