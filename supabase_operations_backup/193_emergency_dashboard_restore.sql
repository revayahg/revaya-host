-- EMERGENCY DASHBOARD RESTORE
-- This completely disables RLS to restore dashboard functionality
-- WARNING: This temporarily removes all security - use only for emergency recovery

-- =============================================================================
-- 1. COMPLETELY DISABLE RLS ON ALL CRITICAL TABLES
-- =============================================================================
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. DROP ALL EXISTING POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "events_basic_access" ON events;
DROP POLICY IF EXISTS "event_user_roles_basic_access" ON event_user_roles;
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;
DROP POLICY IF EXISTS "events_delete_policy" ON events;

-- =============================================================================
-- 3. GRANT FULL ACCESS TO AUTHENTICATED USERS (TEMPORARY)
-- =============================================================================
GRANT ALL ON events TO authenticated;
GRANT ALL ON event_user_roles TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON event_collaborator_invitations TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- =============================================================================
-- 4. RE-ENABLE MINIMAL RLS FOR EVENT_USER_ROLES (NEEDED FOR COLLABORATORS)
-- =============================================================================
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can see roles for events they own or participate in
CREATE POLICY "event_user_roles_minimal_access" ON event_user_roles
    FOR ALL USING (true)  -- Temporarily allow all access to fix collaborator display
    WITH CHECK (true);

-- =============================================================================
-- 5. VERIFY TABLES EXIST AND HAVE DATA
-- =============================================================================
-- Check if events table has any records
SELECT 'Events table record count:' as info, COUNT(*) as count FROM events;

-- Check if event_user_roles has data
SELECT 'Event user roles count:' as info, COUNT(*) as count FROM event_user_roles;

-- Check if there are any user records
SELECT 'User profiles count:' as info, COUNT(*) as count FROM profiles WHERE id IS NOT NULL;

-- Check recent events with their collaborators
SELECT 'Recent events with roles:' as info, e.title, eur.user_id, eur.role, eur.status
FROM events e
LEFT JOIN event_user_roles eur ON e.id = eur.event_id
ORDER BY e.created_at DESC 
LIMIT 10;
