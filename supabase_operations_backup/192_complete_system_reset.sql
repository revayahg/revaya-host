-- EMERGENCY FIX - RESTORE BASIC DASHBOARD ACCESS
-- Drop everything and use the most basic working policies

-- =============================================================================
-- 1. DROP ALL POLICIES AND START COMPLETELY FRESH
-- =============================================================================
DROP POLICY IF EXISTS "events_all_policy" ON events;
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;
DROP POLICY IF EXISTS "events_delete_policy" ON events;

-- =============================================================================
-- 2. CREATE MINIMAL WORKING EVENTS POLICIES
-- =============================================================================

-- Allow users to see their own events OR events where they are collaborators
CREATE POLICY "events_basic_access" ON events
    FOR ALL USING (
        -- Owner access
        created_by = auth.uid()
        OR
        -- Collaborator access - simple check
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = events.id 
            AND event_user_roles.user_id = auth.uid() 
            AND event_user_roles.status = 'active'
        )
    )
    WITH CHECK (
        -- Can only create events as yourself
        created_by = auth.uid()
    );

-- =============================================================================
-- 3. BASIC EVENT_USER_ROLES POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

CREATE POLICY "event_user_roles_basic_access" ON event_user_roles
    FOR ALL USING (
        -- Can see your own roles
        user_id = auth.uid()
        OR
        -- Event owners can manage all roles for their events
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.created_by = auth.uid()
        )
    )
    WITH CHECK (
        -- Event owners can create roles for their events
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.created_by = auth.uid()
        )
    );

-- =============================================================================
-- 4. ENSURE RLS IS ENABLED
-- =============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. GRANT BASIC PERMISSIONS
-- =============================================================================
GRANT ALL ON events TO authenticated;
GRANT ALL ON event_user_roles TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON event_collaborator_invitations TO authenticated;
