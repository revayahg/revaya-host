-- FINAL POLICY RESET - Clean approach to fix all issues
-- Step 1: Drop existing functions that might conflict
DROP FUNCTION IF EXISTS get_user_profile_safe(UUID);
DROP FUNCTION IF EXISTS get_event_participants_simple(UUID);

-- Step 2: Disable RLS temporarily to avoid recursion during cleanup
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies completely
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'event_user_roles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON event_user_roles';
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'event_collaborator_invitations' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON event_collaborator_invitations';
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SIMPLE policies - event owners only
CREATE POLICY "event_owner_full_access" ON event_user_roles
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_user_roles.event_id AND events.user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
);

CREATE POLICY "collaborator_invitation_access" ON event_collaborator_invitations
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborator_invitations.event_id AND events.user_id = auth.uid()) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.user_id = auth.uid())
);

-- Step 6: Grant auth schema access
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Step 7: Create simple RPC function for collaborators
CREATE OR REPLACE FUNCTION get_event_collaborators_safe(event_uuid UUID)
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
        'admin'::TEXT,
        COALESCE(p.first_name || ' ' || p.last_name, u.email),
        'active'::TEXT
    FROM events e
    JOIN auth.users u ON u.id = e.user_id
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id = event_uuid;
    
    -- Return active collaborators
    RETURN QUERY
    SELECT 
        eur.user_id,
        u.email,
        eur.role,
        COALESCE(p.first_name || ' ' || p.last_name, u.email),
        eur.status
    FROM event_user_roles eur
    JOIN auth.users u ON u.id = eur.user_id
    LEFT JOIN profiles p ON p.id = eur.user_id
    WHERE eur.event_id = event_uuid
    AND eur.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_collaborators_safe(UUID) TO authenticated;