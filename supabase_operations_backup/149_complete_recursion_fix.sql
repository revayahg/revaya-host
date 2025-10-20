-- COMPLETE FIX FOR INFINITE RECURSION AND PERMISSION ISSUES
-- This script addresses all the recurring database errors

-- 1. Drop all problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Collaborators can view roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

-- 2. Drop all problematic policies on event_collaborator_invitations
DROP POLICY IF EXISTS "Users can view invitations for their events" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event owners can manage invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "event_collaborator_invitations_select_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "event_collaborator_invitations_insert_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "event_collaborator_invitations_update_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "event_collaborator_invitations_delete_policy" ON event_collaborator_invitations;

-- 3. Create simple, non-recursive policies for event_user_roles
CREATE POLICY "simple_event_user_roles_select" ON event_user_roles
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "simple_event_user_roles_insert" ON event_user_roles
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "simple_event_user_roles_update" ON event_user_roles
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "simple_event_user_roles_delete" ON event_user_roles
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

-- 4. Create simple policies for event_collaborator_invitations
CREATE POLICY "simple_collaborator_invitations_select" ON event_collaborator_invitations
FOR SELECT TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "simple_collaborator_invitations_insert" ON event_collaborator_invitations
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "simple_collaborator_invitations_update" ON event_collaborator_invitations
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "simple_collaborator_invitations_delete" ON event_collaborator_invitations
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.user_id = auth.uid()
    )
);

-- 5. Grant necessary permissions to fix "permission denied for table users"
GRANT SELECT ON auth.users TO authenticated;

-- 6. Create a simple function to get event participants without recursion
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_event_participants_simple(UUID) TO authenticated;