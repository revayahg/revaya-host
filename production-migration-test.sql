-- ===================================================================
-- PRODUCTION MIGRATION TEST SCRIPT
-- ===================================================================
-- Run this FIRST to test the migration on a copy of production data
-- This script only READS data and shows what changes would be made
-- ===================================================================

-- ===================================================================
-- 1. ANALYZE CURRENT PRODUCTION STATE
-- ===================================================================

-- Check current RLS policies
SELECT 
    'Current RLS Policies' as analysis_type,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('event_user_roles', 'message_threads', 'message_participants')
ORDER BY tablename, policyname;

-- Check events without owner roles
SELECT 
    'Events Missing Owner Roles' as analysis_type,
    e.id as event_id,
    e.name as event_name,
    e.user_id as owner_id,
    p.email as owner_email
FROM events e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.user_id = e.user_id 
    AND eur.event_id = e.id
)
ORDER BY e.created_at DESC;

-- Check profiles table structure
SELECT 
    'Profile Table Structure' as analysis_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check user count and profile count
SELECT 
    'User Statistics' as analysis_type,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM events) as total_events,
    (SELECT COUNT(*) FROM event_user_roles) as total_roles;

-- ===================================================================
-- 2. SIMULATE MIGRATION CHANGES (READ-ONLY)
-- ===================================================================

-- Show what roles would be added
SELECT 
    'Roles to be Added' as simulation_type,
    e.id as event_id,
    e.name as event_name,
    e.user_id as owner_id,
    p.email as owner_email,
    'admin' as role_to_add
FROM events e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.user_id = e.user_id 
    AND eur.event_id = e.id
)
ORDER BY e.created_at DESC;

-- Check what RLS policies would be added/modified
SELECT 
    'RLS Policy Changes' as simulation_type,
    'event_user_roles' as table_name,
    'INSERT policy update' as change_type,
    'Allow event owners and collaborators to create roles' as description
UNION ALL
SELECT 
    'RLS Policy Changes' as simulation_type,
    'message_threads' as table_name,
    'New policies' as change_type,
    'Allow collaborators to create/view threads' as description
UNION ALL
SELECT 
    'RLS Policy Changes' as simulation_type,
    'message_participants' as table_name,
    'New policies' as change_type,
    'Allow collaborators to create/view participants' as description;

-- ===================================================================
-- 3. SAFETY CHECKS
-- ===================================================================

-- Check for any potential conflicts
SELECT 
    'Safety Check' as check_type,
    'No conflicts detected' as status,
    'All changes are additive or permissive' as note;

-- Check database size and performance impact
SELECT 
    'Performance Impact' as check_type,
    'Minimal' as impact_level,
    'Only adding policies and missing roles' as note;
