-- Fix database permission errors and infinite recursion
-- This script addresses the critical issues preventing dashboard from loading

-- 1. First, drop all problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view event collaborators" ON public.event_user_roles;
DROP POLICY IF EXISTS "Event owners can manage collaborators" ON public.event_user_roles;
DROP POLICY IF EXISTS "Collaborators can view other collaborators" ON public.event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON public.event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON public.event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON public.event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON public.event_user_roles;

-- 2. Drop problematic policies on event_collaborator_invitations
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "Event owners can manage invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_select_policy" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_insert_policy" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_update_policy" ON public.event_collaborator_invitations;

-- 3. Create simple, non-recursive policies for event_user_roles
CREATE POLICY "event_user_roles_simple_select" ON public.event_user_roles
FOR SELECT USING (
    -- User can see their own roles
    auth.uid() = user_id
    OR
    -- User can see roles for events they own
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "event_user_roles_simple_insert" ON public.event_user_roles
FOR INSERT WITH CHECK (
    -- Only event owners can insert roles
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "event_user_roles_simple_update" ON public.event_user_roles
FOR UPDATE USING (
    -- Only event owners can update roles
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "event_user_roles_simple_delete" ON public.event_user_roles
FOR DELETE USING (
    -- Only event owners can delete roles
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_user_roles.event_id 
        AND events.user_id = auth.uid()
    )
);

-- 4. Create simple policies for event_collaborator_invitations
CREATE POLICY "collaborator_invitations_simple_select" ON public.event_collaborator_invitations
FOR SELECT USING (
    -- Users can see invitations sent to their email
    email = auth.email()
    OR
    -- Event owners can see all invitations for their events
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "collaborator_invitations_simple_insert" ON public.event_collaborator_invitations
FOR INSERT WITH CHECK (
    -- Only event owners can create invitations
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.user_id = auth.uid()
    )
);

CREATE POLICY "collaborator_invitations_simple_update" ON public.event_collaborator_invitations
FOR UPDATE USING (
    -- Users can update invitations sent to their email (for accepting)
    email = auth.email()
    OR
    -- Event owners can update invitations for their events
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.user_id = auth.uid()
    )
);

-- 5. Ensure profiles table has proper access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (true); -- Allow all authenticated users to read profiles

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 6. Drop existing function if it exists and create helper function to safely get user profile data
DROP FUNCTION IF EXISTS get_user_profile_safe(uuid);

CREATE FUNCTION get_user_profile_safe(user_uuid uuid)
RETURNS TABLE(
    id uuid,
    email text,
    first_name text,
    last_name text,
    display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown User') as display_name
    FROM public.profiles p
    WHERE p.id = user_uuid;
    
    -- If no profile found, try to get from auth.users
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            NULL::text as first_name,
            NULL::text as last_name,
            COALESCE(u.email, 'Unknown User') as display_name
        FROM auth.users u
        WHERE u.id = user_uuid;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO authenticated;
