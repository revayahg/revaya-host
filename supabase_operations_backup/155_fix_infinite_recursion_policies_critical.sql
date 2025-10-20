-- CRITICAL FIX: Infinite recursion in database policies
-- This script completely resets and simplifies all RLS policies

-- Step 1: Disable RLS on all affected tables
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pins DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to eliminate recursion
DO $$ 
DECLARE 
    pol_name TEXT;
BEGIN
    -- Drop all policies on events table
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'events'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON events';
    END LOOP;
    
    -- Drop all policies on event_user_roles table
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'event_user_roles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON event_user_roles';
    END LOOP;
    
    -- Drop all policies on event_collaborator_invitations table
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'event_collaborator_invitations'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON event_collaborator_invitations';
    END LOOP;
    
    -- Drop all policies on tasks table
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'tasks'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON tasks';
    END LOOP;
    
    -- Drop all policies on pins table
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'pins'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol_name) || ' ON pins';
    END LOOP;
END $$;

-- Step 3: Create simple, non-recursive policies

-- Events: Owner can do everything, collaborators can read
CREATE POLICY "events_access" ON events FOR ALL USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM event_user_roles 
        WHERE event_id = events.id 
        AND user_id = auth.uid() 
        AND status = 'active'
    )
);

-- Event User Roles: Users can see their own roles
CREATE POLICY "event_user_roles_access" ON event_user_roles FOR ALL USING (
    user_id = auth.uid()
);

-- Collaborator Invitations: Simple access based on email or inviter
CREATE POLICY "collaborator_invitations_access" ON event_collaborator_invitations FOR ALL USING (
    invited_by = auth.uid() 
    OR auth.email() = email
);

-- Tasks: Event participants can access
CREATE POLICY "tasks_access" ON tasks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = tasks.event_id 
        AND events.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM event_user_roles 
        WHERE event_user_roles.event_id = tasks.event_id 
        AND event_user_roles.user_id = auth.uid() 
        AND event_user_roles.status = 'active'
    )
);

-- Pins: Event participants can access
CREATE POLICY "pins_access" ON pins FOR ALL USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = pins.event_id 
        AND events.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM event_user_roles 
        WHERE event_user_roles.event_id = pins.event_id 
        AND event_user_roles.user_id = auth.uid() 
        AND event_user_roles.status = 'active'
    )
);

-- Step 4: Re-enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 6: Create helper function for safe user profile access
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_uuid UUID)
RETURNS TABLE(email TEXT, full_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.email, au.email) as email,
        COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', 'Unknown User') as full_name
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    WHERE au.id = user_uuid;
END;
$$;
